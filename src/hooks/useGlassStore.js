import React, { createContext, useContext } from 'react';
import { useLocalStorage } from './useLocalStorage';

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
    { id: '1', name: 'Transparent 6mm', price: 400, unit: 'm2' },
    { id: '2', name: 'Fume 6mm', price: 550, unit: 'm2' },
    { id: '3', name: 'Sekkurit 10mm', price: 1200, unit: 'm2' },
];

const DEFAULT_CUSTOM_BUTTONS = [
    { id: 'cb1', name: 'خصم 10%', type: 'discount_percent', value: 10 },
    { id: 'cb2', name: 'شحن وتوصيل', type: 'fee_fixed', value: 100 },
    { id: 'cb3', name: 'ضريبة 14%', type: 'fee_percent', value: 14 },
];

const DEFAULT_PRINT_SETTINGS = {
    workshopName: 'ورشة الزجاج الحديثة',
    ownerName: '',
    taxNumber: '',
    address: '',
    phone: '',
    footerNote: 'نشكركم لتعاملكم معنا - ورشة الزجاج الحديثة للخدمات الفنية',
};

// Simple hash function for password storage (not cryptographically secure, for demo only)
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

function useGlassStoreInternal() {
    const [glassTypes, setGlassTypes] = useLocalStorage('glass-types', DEFAULT_GLASS_TYPES);
    const [orders, setOrders] = useLocalStorage('glass-orders-history', []);
    const [customButtons, setCustomButtons] = useLocalStorage('glass-custom-buttons', DEFAULT_CUSTOM_BUTTONS);
    const [currentUser, setCurrentUser] = useLocalStorage('glass-current-user', null);
    const [registeredUsers, setRegisteredUsers] = useLocalStorage('glass-registered-users', []);
    const [printSettings, setPrintSettings] = useLocalStorage('glass-print-settings', DEFAULT_PRINT_SETTINGS);

    // Glass Type CRUD
    const addGlassType = (type) => {
        setGlassTypes((prev) => [...prev, { ...type, id: Date.now().toString() }]);
    };

    const updateGlassType = (id, updatedType) => {
        setGlassTypes((prev) => prev.map((t) => (t.id === id ? { ...t, ...updatedType } : t)));
    };

    const deleteGlassType = (id) => {
        setGlassTypes((prev) => prev.filter((t) => t.id !== id));
    };

    // Custom Button CRUD
    const addCustomButton = (button) => {
        setCustomButtons((prev) => [...prev, { ...button, id: Date.now().toString() }]);
    };

    const updateCustomButton = (id, updatedButton) => {
        setCustomButtons((prev) => prev.map((b) => (b.id === id ? { ...b, ...updatedButton } : b)));
    };

    const deleteCustomButton = (id) => {
        setCustomButtons((prev) => prev.filter((b) => b.id !== id));
    };

    // Orders CRUD
    const saveOrder = (order) => {
        setOrders(prev => [
            { ...order, id: Date.now().toString(), date: order.date || new Date().toISOString(), paymentHistory: [] },
            ...prev
        ]);
    };

    const deleteOrder = (id) => {
        setOrders(prev => prev.filter(o => o.id !== id));
    };

    // Update payment on an existing order (without deleting the original)
    const updateOrderPayment = (orderId, payment) => {
        // payment = { amount: Number, note: String, date: ISOString }
        setOrders(prev => prev.map(order => {
            if (order.id !== orderId) return order;

            const newPayment = {
                id: Date.now().toString(),
                amount: Number(payment.amount),
                note: payment.note || '',
                date: payment.date || new Date().toISOString(),
            };

            const existingHistory = order.paymentHistory || [];
            const updatedHistory = [...existingHistory, newPayment];

            // Total paid = original deposit + all subsequent payments
            const originalDeposit = order.deposit || 0;
            const additionalPaid = updatedHistory.reduce((sum, p) => sum + p.amount, 0);
            const totalPaid = originalDeposit + additionalPaid;
            const newRemaining = Math.max(0, order.totalCost - totalPaid);

            return {
                ...order,
                paymentHistory: updatedHistory,
                remainingBalance: newRemaining,
            };
        }));
    };

    // Update order fields (e.g. customer info, totalCost, deposit, paymentHistory)
    const updateOrder = (orderId, updatedFields) => {
        setOrders(prev => prev.map(order => {
            if (order.id !== orderId) return order;

            const newOrder = { ...order, ...updatedFields };

            // Recalculate remainingBalance
            const originalDeposit = Number(newOrder.deposit || 0);
            const additionalPaid = (newOrder.paymentHistory || []).reduce((sum, p) => sum + Number(p.amount), 0);
            const totalPaid = originalDeposit + additionalPaid;
            newOrder.remainingBalance = Math.max(0, Number(newOrder.totalCost || 0) - totalPaid);

            return newOrder;
        }));
    };

    // Print Settings
    const updatePrintSettings = (settings) => {
        setPrintSettings(prev => ({ ...prev, ...settings }));
    };

    // Auth Functions
    const registerUser = (name, password) => {
        const existing = registeredUsers.find(u => u.name.toLowerCase() === name.toLowerCase());
        if (existing) {
            return { success: false, error: 'هذا الاسم مسجل مسبقاً، جرب اسماً آخر' };
        }
        const newUser = {
            id: Date.now().toString(),
            name,
            passwordHash: simpleHash(password),
            provider: 'local',
            createdAt: new Date().toISOString(),
        };
        setRegisteredUsers(prev => [...prev, newUser]);
        const safeUser = { id: newUser.id, name, provider: 'local' };
        setCurrentUser(safeUser);
        return { success: true, user: safeUser };
    };

    const loginUser = (name, password) => {
        const found = registeredUsers.find(
            u => u.name.toLowerCase() === name.toLowerCase() && u.passwordHash === simpleHash(password)
        );
        if (!found) {
            return { success: false, error: 'الاسم أو كلمة المرور غير صحيحة' };
        }
        const safeUser = { id: found.id, name: found.name, provider: 'local' };
        setCurrentUser(safeUser);
        return { success: true, user: safeUser };
    };

    const loginSocial = (provider, name, email) => {
        const safeUser = {
            id: `${provider}-${Date.now()}`,
            name: name || `مستخدم ${provider === 'facebook' ? 'فيسبوك' : 'جوجل'}`,
            email: email || '',
            provider,
        };
        setCurrentUser(safeUser);
        return { success: true, user: safeUser };
    };

    const logoutUser = () => {
        setCurrentUser(null);
    };

    return {
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
        currentUser,
        registeredUsers,
        registerUser,
        loginUser,
        loginSocial,
        logoutUser,
    };
}
