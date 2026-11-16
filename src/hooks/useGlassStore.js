import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export const generateSerialNumber = (orders = []) => {
    let maxNum = 1000;
    (orders || []).forEach(o => {
        const str = o.serialNumber || o.serial_number || '';
        const match = str.match(/\d+/);
        if (match) {
            const n = parseInt(match[0], 10);
            if (n > maxNum && n < 1000000) maxNum = n;
        }
    });
    return `#INV-${maxNum + 1}`;
};

export const normalizeOrder = (o, index = 0, totalOrders = 1) => {
    if (!o) return o;
    let meta = {};
    if (o.status && typeof o.status === 'string' && o.status.trim().startsWith('{')) {
        try {
            meta = JSON.parse(o.status);
        } catch (e) {
            meta = {};
        }
    }
    const fallbackSerial = `#INV-${1000 + (totalOrders - index)}`;
    const serialNumber = meta.serialNumber || o.serial_number || o.serialNumber || fallbackSerial;
    return {
        ...o,
        status: meta.status || o.status || 'pending',
        serialNumber,
        serial_number: serialNumber,
        adjustments: o.adjustments || meta.adjustments || [],
        activeButtons: o.activeButtons || meta.activeButtons || [],
        baseCost: o.base_cost ?? meta.baseCost ?? o.baseCost ?? 0,
        base_cost: o.base_cost ?? meta.baseCost ?? o.baseCost ?? 0,
        totalArea: o.total_area ?? meta.totalArea ?? o.totalArea ?? 0,
        total_area: o.total_area ?? meta.totalArea ?? o.totalArea ?? 0,
    };
};

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
    { name: 'صنف قياسي أ (م²)', price: 400, unit: 'm2' },
    { name: 'صنف قياسي ب (م.ط)', price: 200, unit: 'linear_x2' },
    { name: 'صنف قياسي ج (قطعة)', price: 150, unit: 'piece' },
];

const DEFAULT_CUSTOM_BUTTONS = [
    { name: 'خصم 10%', type: 'discount_percent', value: 10 },
    { name: 'شحن وتوصيل', type: 'fee_fixed', value: 100 },
    { name: 'ضريبة 14%', type: 'fee_percent', value: 14 },
];

const DEFAULT_PRINT_SETTINGS = {
    workshop_name: 'ورشة العمل الحديثة',
    owner_name: '',
    tax_number: '',
    address: '',
    phone: '',
    footer_note: 'نشكركم لتعاملكم معنا - ورشة العمل الحديثة للخدمات الفنية',
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

    // يمنع تحميل نفس بيانات المستخدم أكتر من مرة
    const loadedUserRef = useRef(null);

    // Load workshop data
    const loadWorkshopData = async (user, force = false) => {
        if (!user) return;
        if (!force && loadedUserRef.current === user.id) return; // منع التكرار
        loadedUserRef.current = user.id;
        const userId = user.id;

        try {
            setLoading(true);
            setError(null);

            // 1. Get workshop membership
            const { data: membership, error: memError } = await supabase
                .from('workshop_members')
                .select('workshop_id, role, workshops(name)')
                .eq('user_id', userId)
                .limit(1)
                .maybeSingle();

            if (memError) throw memError;

            if (!membership?.workshop_id) {
                // No workshop found yet
                console.log('No workshop found for user, waiting for workshop creation');
                setActiveWorkshop(null);
                setUserRole(null);
                setSubscription(null);
                setGlassTypes([]);
                setCustomButtons([]);
                setLoading(false);
                return;
            }

            const wId = membership.workshop_id;
            setActiveWorkshop({ id: wId, name: membership.workshops?.name });
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

            // VIP / Admin emails list for lifetime trial access
            const VIP_EMAILS = ['mahmoudhameidshoura@gmail.com'];
            const userEmail = user.email;
            const isVipUser = userEmail && VIP_EMAILS.includes(userEmail.toLowerCase());

            if (isVipUser) {
                setSubscription({
                    id: subData?.id || 'vip-lifetime-sub',
                    workshop_id: wId,
                    plan_id: 'lifetime',
                    status: 'active',
                    end_date: '2099-12-31T23:59:59.000Z',
                    created_at: subData?.created_at || new Date().toISOString()
                });
            } else if (subData) {
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
            const rawOrders = dbOrders || [];
            const normalizedOrders = rawOrders.map((o, idx) => normalizeOrder(o, idx, rawOrders.length));
            setOrders(normalizedOrders);
            if (print) setPrintSettings(print);

        } catch (err) {
            console.error('Error loading workshop details:', err);
            loadedUserRef.current = null; // اسمح بإعادة المحاولة
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Track Auth state
    useEffect(() => {
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (session?.user) {
                    setCurrentUser(session.user);
                    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
                        // setTimeout عشان نتجنب الـ deadlock بتاع Supabase
                        setTimeout(() => loadWorkshopData(session.user), 0);
                    }
                } else {
                    loadedUserRef.current = null;
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Create a new workshop and populate default values
    const createWorkshop = async (name) => {
        try {
            setLoading(true);
            setError(null);
            const { data: wId, error: rpcError } = await supabase.rpc('create_workshop_with_owner', {
                workshop_name: name
            });

            if (rpcError) throw rpcError;

            if (!wId) {
                throw new Error('فشل في إنشاء الورشة');
            }

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

            // Reload everything for this user - critical step
            if (currentUser) {
                await loadWorkshopData(currentUser, true);
            }
            return { success: true };
        } catch (err) {
            console.error('Error creating workshop:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    // Glass Type CRUD
    const addGlassType = async (type) => {
        if (!activeWorkshop) {
            return { success: false, error: 'لم يتم تحديد الورشة بعد' };
        }
        const { data, error } = await supabase
            .from('glass_types')
            .insert({ ...type, workshop_id: activeWorkshop.id })
            .select()
            .single();
        if (!error && data) {
            setGlassTypes(prev => [...prev, data]);
            return { success: true, data };
        }
        return { success: false, error: error?.message || 'فشل إضافة الصنف' };
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
        if (!activeWorkshop) {
            return { success: false, error: 'لم يتم تحديد الورشة بعد' };
        }
        const { data, error } = await supabase
            .from('custom_buttons')
            .insert({ ...button, workshop_id: activeWorkshop.id })
            .select()
            .single();
        if (!error && data) {
            setCustomButtons(prev => [...prev, data]);
            return { success: true, data };
        }
        return { success: false, error: error?.message || 'فشل إضافة الزر' };
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
        if (!activeWorkshop) return null;
        const serialNumber = order.serialNumber || order.serial_number || generateSerialNumber(orders);
        const meta = {
            status: order.status || 'pending',
            serialNumber,
            adjustments: order.adjustments || [],
            activeButtons: order.activeButtons || [],
            baseCost: Number(order.baseCost || 0),
            totalArea: Number(order.totalArea || 0),
        };

        const phone = order.customerPhone || order.phoneNumber || '';

        const insertPayload = {
            workshop_id: activeWorkshop.id,
            customer_name: order.customerName,
            customer_phone: phone,
            total_cost: Number(order.totalCost),
            deposit: Number(order.deposit || 0),
            remaining_balance: Number(order.remainingBalance || 0),
            items: order.items || [],
            payment_history: order.paymentHistory || [],
            status: JSON.stringify(meta),
            date: order.date || new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('orders')
            .insert(insertPayload)
            .select()
            .single();

        if (error) {
            console.error('saveOrder error:', error);
            alert('حدث خطأ أثناء حفظ الفاتورة: ' + error.message);
            return null;
        }

        if (data) {
            const normalized = normalizeOrder({
                ...data,
                ...meta,
                customer_phone: phone,
            });
            setOrders(prev => [normalized, ...prev]);
            return normalized;
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

    const markOrderPaid = async (orderId) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) {
            console.error('markOrderPaid: الفاتورة مش موجودة', orderId);
            return;
        }

        const total = Number(order.total_cost || 0);
        const remaining = order.remaining_balance != null
            ? Number(order.remaining_balance)
            : total - Number(order.deposit || 0);

        if (remaining <= 0) return;

        const newPayment = {
            id: Date.now().toString(),
            amount: remaining,
            note: 'استلام المبلغ المتبقي بالكامل',
            date: new Date().toISOString(),
        };
        const updatedHistory = [...(order.payment_history || []), newPayment];

        const { data, error } = await supabase
            .from('orders')
            .update({ payment_history: updatedHistory, remaining_balance: 0 })
            .eq('id', orderId)
            .select()
            .single();

        if (error) {
            console.error('markOrderPaid error:', error);
            alert('فشل تسجيل الاستلام: ' + error.message);
            return;
        }

        setOrders(prev => prev.map(o => (o.id === orderId ? normalizeOrder({ ...o, ...data, remaining_balance: 0 }) : o)));
    };

    const updateOrder = async (orderId, updatedFields) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return null;

        const dbFields = {};
        if (updatedFields.customerName !== undefined) dbFields.customer_name = updatedFields.customerName;
        if (updatedFields.customerPhone !== undefined || updatedFields.phoneNumber !== undefined) {
            dbFields.customer_phone = updatedFields.customerPhone || updatedFields.phoneNumber;
        }
        if (updatedFields.totalCost !== undefined) dbFields.total_cost = Number(updatedFields.totalCost);
        if (updatedFields.deposit !== undefined) dbFields.deposit = Number(updatedFields.deposit);
        if (updatedFields.items !== undefined) dbFields.items = updatedFields.items;
        if (updatedFields.paymentHistory !== undefined) dbFields.payment_history = updatedFields.paymentHistory;
        if (updatedFields.date !== undefined) dbFields.date = updatedFields.date;

        const serialNumber = updatedFields.serialNumber || updatedFields.serial_number || order.serialNumber || generateSerialNumber(orders);
        const adjustments = updatedFields.adjustments !== undefined ? updatedFields.adjustments : (order.adjustments || []);
        const activeButtons = updatedFields.activeButtons !== undefined ? updatedFields.activeButtons : (order.activeButtons || []);
        const baseCost = updatedFields.baseCost !== undefined ? Number(updatedFields.baseCost) : (order.baseCost || 0);
        const totalArea = updatedFields.totalArea !== undefined ? Number(updatedFields.totalArea) : (order.totalArea || 0);

        const meta = {
            status: updatedFields.status || order.status || 'pending',
            serialNumber,
            adjustments,
            activeButtons,
            baseCost,
            totalArea
        };
        dbFields.status = JSON.stringify(meta);

        const originalDeposit = Number(updatedFields.deposit !== undefined ? updatedFields.deposit : order.deposit || 0);
        const totalCostVal = Number(updatedFields.totalCost !== undefined ? updatedFields.totalCost : order.total_cost || 0);
        const history = updatedFields.paymentHistory !== undefined ? updatedFields.paymentHistory : (order.payment_history || []);
        const additionalPaid = history.reduce((sum, p) => sum + Number(p.amount), 0);
        const totalPaid = originalDeposit + additionalPaid;
        const newRemaining = Math.max(0, totalCostVal - totalPaid);
        dbFields.remaining_balance = newRemaining;

        const { error } = await supabase
            .from('orders')
            .update(dbFields)
            .eq('id', orderId);

        if (!error) {
            const merged = normalizeOrder({
                ...order,
                ...dbFields,
                ...meta,
                remaining_balance: newRemaining
            });
            setOrders(prev => prev.map(o => (o.id === orderId ? merged : o)));
            return merged;
        } else {
            console.error('updateOrder error:', error);
            alert('حدث خطأ أثناء تحديث الفاتورة: ' + error.message);
            return null;
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
            .upsert({ workshop_id: activeWorkshop.id, ...dbFields });

        if (!error) {
            setPrintSettings(prev => ({ ...prev, ...dbFields }));
        }
    };

    // Auth Actions
    const registerUser = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });
            if (error) throw error;
            // لو تأكيد الإيميل مفعّل، مفيش session لحد ما المستخدم يفتح اللينك
            if (!data.session) {
                return { success: true, needsConfirmation: true };
            }
            return { success: true, user: data.user };
        } catch (err) {
            const message = err.message === 'Failed to fetch'
                ? 'فشل الاتصال بخادم Supabase. يرجى التأكد من صحة VITE_SUPABASE_URL في ملف .env.local والاتصال بالإنترنت.'
                : err.message;
            return { success: false, error: message };
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
            const message = err.message === 'Failed to fetch'
                ? 'فشل الاتصال بخادم Supabase. يرجى التأكد من صحة VITE_SUPABASE_URL في ملف .env.local والاتصال بالإنترنت.'
                : err.message;
            return { success: false, error: message };
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
                await loadWorkshopData(currentUser, true);
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
        markOrderPaid,
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