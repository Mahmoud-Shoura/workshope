import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const GlassStoreContext = createContext(null);

export function GlassStoreProvider({ children }) {
    const store = useGlassStoreInternal();
    return React.createElement(GlassStoreContext.Provider, { value: store }, children);
}

export function useGlassStore() {
    const context = useContext(GlassStoreContext);
    return context;
}

const DEFAULT_GLASS_TYPES = [
    { name: 'Transparent 6mm', price: 400, unit: 'm2' },
    { name: 'Fume 6mm', price: 550, unit: 'm2' },
    { name: 'Sekkurit 10mm', price: 1200, unit: 'm2' },
];

const DEFAULT_CUSTOM_BUTTONS = [
    { name: 'خصم 10%', type: 'discount_percent', value: 10 },
    { name: 'شحن وتوصيل', type: 'fee_fixed', value: 100 },
    { name: 'ضريبة 14%', type: 'fee_percent', value: 14 },
];

const DEFAULT_PRINT_SETTINGS = {
    workshop_name: 'ورشة الزجاج الحديثة',
    owner_name: '',
    tax_number: '',
    address: '',
    phone: '',
    footer_note: 'نشكركم لتعاملكم معنا - ورشة الزجاج الحديثة للخدمات الفنية',
};

function useGlassStoreInternal() {
    const [currentUser, setCurrentUser] = useState(null);
    const [activeWorkshop, setActiveWorkshop] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [subscription, setSubscription] = useState(null);

    const [glassTypes, setGlassTypes] = useState([]);
    const [customButtons, setCustomButtons] = useState([]);
    const [orders, setOrders] = useState([]);
    const [printSettings, setPrintSettings] = useState(DEFAULT_PRINT_SETTINGS);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Track Auth state
    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setCurrentUser(session.user);
                await loadWorkshopData(session.user.id);
            } else {
                setLoading(false);
            }
        };
        getSession();

        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session?.user) {
                    setCurrentUser(session.user);
                    await loadWorkshopData(session.user.id);
                } else {
                    setCurrentUser(null);
                    setActiveWorkshop(null);
                    setUserRole(null);
                    setSubscription(null);
                    setGlassTypes([]);
                    setCustomButtons([]);
                    setOrders([]);
                    setPrintSettings(DEFAULT_PRINT_SETTINGS);
                    setLoading(false);
                }
            }
        );

        return () => {
            authSubscription?.unsubscribe();
        };
    }, []);

    // Load workshop data
    const loadWorkshopData = async (userId) => {
        try {
            setLoading(true);
            setError(null);

            // 1. Get workshop membership
            const { data: membership, error: memError } = await supabase
                .from('workshop_members')
                .select('workshop_id, role, workshops(name)')
                .eq('user_id', userId)
                .single();

            if (memError) {
                if (memError.code === 'PGRST116') {
                    // No workshop found yet
                    setActiveWorkshop(null);
                    setUserRole(null);
                    setSubscription(null);
                    setLoading(false);
                    return;
                }
                throw memError;
            }

            const wId = membership.workshop_id;
            setActiveWorkshop({ id: wId, name: membership.workshops.name });
            setUserRole(membership.role);

            // 2. Fetch Subscription details
            const { data: subData, error: subError } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('workshop_id', wId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (subError) throw subError;

            // Check if trial has ended
            if (subData) {
                const now = new Date();
                const endDate = new Date(subData.end_date);
                if (now > endDate && subData.status !== 'expired') {
                    // Automatically mark as expired if end date passed
                    const { data: updatedSub, error: updateError } = await supabase
                        .from('subscriptions')
                        .update({ status: 'expired' })
                        .eq('id', subData.id)
                        .select()
                        .single();
                    if (!updateError && updatedSub) {
                        setSubscription(updatedSub);
                    } else {
                        setSubscription(subData);
                    }
                } else {
                    setSubscription(subData);
                }
            }

            // 3. Fetch app data
            const [
                { data: types },
                { data: buttons },
                { data: dbOrders },
                { data: print }
            ] = await Promise.all([
                supabase.from('glass_types').select('*').eq('workshop_id', wId),
                supabase.from('custom_buttons').select('*').eq('workshop_id', wId),
                supabase.from('orders').select('*').eq('workshop_id', wId).order('date', { ascending: false }),
                supabase.from('print_settings').select('*').eq('workshop_id', wId).maybeSingle()
            ]);

            setGlassTypes(types || []);
            setCustomButtons(buttons || []);
            setOrders(dbOrders || []);
            if (print) setPrintSettings(print);

        } catch (err) {
            console.error('Error loading workshop details:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Create a new workshop and populate default values
    const createWorkshop = async (name) => {
        try {
            setLoading(true);
            const { data: wId, error: rpcError } = await supabase.rpc('create_workshop_with_owner', {
                workshop_name: name
            });

            if (rpcError) throw rpcError;

            // Create default print settings
            await supabase.from('print_settings').insert({
                workshop_id: wId,
                ...DEFAULT_PRINT_SETTINGS,
                workshop_name: name
            });

            // Create default glass types
            await supabase.from('glass_types').insert(
                DEFAULT_GLASS_TYPES.map(t => ({ ...t, workshop_id: wId }))
            );

            // Create default custom buttons
            await supabase.from('custom_buttons').insert(
                DEFAULT_CUSTOM_BUTTONS.map(b => ({ ...b, workshop_id: wId }))
            );

            // Reload everything for this user
            if (currentUser) {
                await loadWorkshopData(currentUser.id);
            }
            return { success: true };
        } catch (err) {
            console.error('Error creating workshop:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    // Glass Type CRUD
    const addGlassType = async (type) => {
        if (!activeWorkshop) return;
        const { data, error } = await supabase
            .from('glass_types')
            .insert({ ...type, workshop_id: activeWorkshop.id })
            .select()
            .single();
        if (!error && data) {
            setGlassTypes(prev => [...prev, data]);
        }
    };

    const updateGlassType = async (id, updatedType) => {
        const { error } = await supabase
            .from('glass_types')
            .update(updatedType)
            .eq('id', id);
        if (!error) {
            setGlassTypes(prev => prev.map(t => (t.id === id ? { ...t, ...updatedType } : t)));
        }
    };

    const deleteGlassType = async (id) => {
        const { error } = await supabase
            .from('glass_types')
            .delete()
            .eq('id', id);
        if (!error) {
            setGlassTypes(prev => prev.filter(t => t.id !== id));
        }
    };

    // Custom Button CRUD
    const addCustomButton = async (button) => {
        if (!activeWorkshop) return;
        const { data, error } = await supabase
            .from('custom_buttons')
            .insert({ ...button, workshop_id: activeWorkshop.id })
            .select()
            .single();
        if (!error && data) {
            setCustomButtons(prev => [...prev, data]);
        }
    };

    const updateCustomButton = async (id, updatedButton) => {
        const { error } = await supabase
            .from('custom_buttons')
            .update(updatedButton)
            .eq('id', id);
        if (!error) {
            setCustomButtons(prev => prev.map(b => (b.id === id ? { ...b, ...updatedButton } : b)));
        }
    };

    const deleteCustomButton = async (id) => {
        const { error } = await supabase
            .from('custom_buttons')
            .delete()
            .eq('id', id);
        if (!error) {
            setCustomButtons(prev => prev.filter(b => b.id !== id));
        }
    };

    // Orders CRUD
    const saveOrder = async (order) => {
        if (!activeWorkshop) return;
        const { data, error } = await supabase
            .from('orders')
            .insert({
                workshop_id: activeWorkshop.id,
                customer_name: order.customerName,
                customer_phone: order.customerPhone,
                total_cost: Number(order.totalCost),
                deposit: Number(order.deposit || 0),
                remaining_balance: Number(order.remainingBalance || 0),
                items: order.items || [],
                payment_history: [],
                date: order.date || new Date().toISOString()
            })
            .select()
            .single();
        if (!error && data) {
            setOrders(prev => [data, ...prev]);
        }
    };

    const deleteOrder = async (id) => {
        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', id);
        if (!error) {
            setOrders(prev => prev.filter(o => o.id !== id));
        }
    };

    const updateOrderPayment = async (orderId, payment) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const newPayment = {
            id: Date.now().toString(),
            amount: Number(payment.amount),
            note: payment.note || '',
            date: payment.date || new Date().toISOString(),
        };

        const updatedHistory = [...(order.payment_history || []), newPayment];
        const originalDeposit = Number(order.deposit || 0);
        const additionalPaid = updatedHistory.reduce((sum, p) => sum + p.amount, 0);
        const totalPaid = originalDeposit + additionalPaid;
        const newRemaining = Math.max(0, Number(order.total_cost) - totalPaid);

        const { error } = await supabase
            .from('orders')
            .update({
                payment_history: updatedHistory,
                remaining_balance: newRemaining
            })
            .eq('id', orderId);

        if (!error) {
            setOrders(prev => prev.map(o => (o.id === orderId ? {
                ...o,
                payment_history: updatedHistory,
                remaining_balance: newRemaining
            } : o)));
        }
    };

    const updateOrder = async (orderId, updatedFields) => {
        // Map camelCase fields from frontend if any
        const dbFields = {};
        if (updatedFields.customerName !== undefined) dbFields.customer_name = updatedFields.customerName;
        if (updatedFields.customerPhone !== undefined) dbFields.customer_phone = updatedFields.customerPhone;
        if (updatedFields.totalCost !== undefined) dbFields.total_cost = Number(updatedFields.totalCost);
        if (updatedFields.deposit !== undefined) dbFields.deposit = Number(updatedFields.deposit);
        if (updatedFields.items !== undefined) dbFields.items = updatedFields.items;
        if (updatedFields.paymentHistory !== undefined) dbFields.payment_history = updatedFields.paymentHistory;

        // Fetch local order object to calculate remaining balance
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const merged = { ...order, ...dbFields };
        const originalDeposit = Number(merged.deposit || 0);
        const additionalPaid = (merged.payment_history || []).reduce((sum, p) => sum + Number(p.amount), 0);
        const totalPaid = originalDeposit + additionalPaid;
        merged.remaining_balance = Math.max(0, Number(merged.total_cost || 0) - totalPaid);
        dbFields.remaining_balance = merged.remaining_balance;

        const { error } = await supabase
            .from('orders')
            .update(dbFields)
            .eq('id', orderId);

        if (!error) {
            setOrders(prev => prev.map(o => (o.id === orderId ? merged : o)));
        }
    };

    // Print Settings
    const updatePrintSettings = async (settings) => {
        if (!activeWorkshop) return;
        const dbFields = {};
        if (settings.workshopName !== undefined) dbFields.workshop_name = settings.workshopName;
        if (settings.ownerName !== undefined) dbFields.owner_name = settings.ownerName;
        if (settings.taxNumber !== undefined) dbFields.tax_number = settings.taxNumber;
        if (settings.address !== undefined) dbFields.address = settings.address;
        if (settings.phone !== undefined) dbFields.phone = settings.phone;
        if (settings.footerNote !== undefined) dbFields.footer_note = settings.footerNote;

        const { error } = await supabase
            .from('print_settings')
            .update(dbFields)
            .eq('workshop_id', activeWorkshop.id);

        if (!error) {
            setPrintSettings(prev => ({ ...prev, ...dbFields }));
        }
    };

    // Auth Actions
    const registerUser = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password
            });
            if (error) throw error;
            return { success: true, user: data.user };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const loginUser = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            return { success: true, user: data.user };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const logoutUser = async () => {
        await supabase.auth.signOut();
    };

    // Subscriptions and payments
    const submitPayment = async (subscriptionId, amount, method, ref) => {
        try {
            const { error: pError } = await supabase.from('payments').insert({
                subscription_id: subscriptionId,
                amount,
                method,
                transaction_ref: ref,
                status: 'pending_review'
            });
            if (pError) throw pError;
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    const getPendingPayments = async () => {
        if (!activeWorkshop || userRole !== 'owner') return [];
        const { data, error: pError } = await supabase
            .from('payments')
            .select('*, subscriptions(workshop_id, workshops(name))')
            .eq('status', 'pending_review');
        if (pError) return [];
        return data || [];
    };

    const confirmPayment = async (paymentId, action = 'confirmed') => {
        try {
            // Get payment details
            const { data: payment, error: pError } = await supabase
                .from('payments')
                .select('*, subscriptions(*)')
                .eq('id', paymentId)
                .single();

            if (pError) throw pError;

            // Update payment status
            const { error: updatePayError } = await supabase
                .from('payments')
                .update({ status: action })
                .eq('id', paymentId);

            if (updatePayError) throw updatePayError;

            if (action === 'confirmed') {
                // Fetch the plan duration
                const { data: sub } = await supabase
                    .from('subscriptions')
                    .select('*')
                    .eq('id', payment.subscription_id)
                    .single();

                let days = 30;
                if (sub.plan_id === 'weekly') days = 7;
                else if (sub.plan_id === 'yearly') days = 365;

                // Update subscription status to active and extend end_date
                const { error: updateSubError } = await supabase
                    .from('subscriptions')
                    .update({
                        status: 'active',
                        start_date: new Date().toISOString(),
                        end_date: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
                    })
                    .eq('id', payment.subscription_id);

                if (updateSubError) throw updateSubError;
            }

            // Reload info
            if (currentUser) {
                await loadWorkshopData(currentUser.id);
            }
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    // User management (Owner role only)
    const getWorkshopMembers = async () => {
        if (!activeWorkshop) return [];
        const { data, error } = await supabase
            .from('workshop_members')
            .select('*')
            .eq('workshop_id', activeWorkshop.id);
        if (error) return [];
        return data;
    };

    const inviteMember = async (invitedEmail, role) => {
        if (!activeWorkshop || userRole !== 'owner') return { success: false, error: 'غير مصرح لك' };
        try {
            // Check if user already exists in auth.users by email (simulate via DB function or try to insert to workshop_members)
            // For now, we store invited_email and check when that user signs up.
            // A trigger or RPC would map a new signup to any pending workshop invitations!
            // Let's create a pending invitation
            const { error } = await supabase
                .from('workshop_members')
                .insert({
                    workshop_id: activeWorkshop.id,
                    invited_email: invitedEmail.toLowerCase(),
                    role: role,
                    // If the user already exists, we will link it, but for simplicity, we insert and let them join later.
                    // We'll query if auth user exists.
                });
            if (error) throw error;
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    };

    return {
        loading,
        error,
        currentUser,
        activeWorkshop,
        userRole,
        subscription,
        glassTypes,
        addGlassType,
        updateGlassType,
        deleteGlassType,
        customButtons,
        addCustomButton,
        updateCustomButton,
        deleteCustomButton,
        orders,
        saveOrder,
        deleteOrder,
        updateOrderPayment,
        updateOrder,
        printSettings,
        updatePrintSettings,
        registerUser,
        loginUser,
        logoutUser,
        createWorkshop,
        submitPayment,
        getPendingPayments,
        confirmPayment,
        getWorkshopMembers,
        inviteMember
    };
}
