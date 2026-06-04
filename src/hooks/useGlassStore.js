import { useLocalStorage } from './useLocalStorage';

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

export function useGlassStore() {
    const [glassTypes, setGlassTypes] = useLocalStorage('glass-types', DEFAULT_GLASS_TYPES);
    const [orders, setOrders] = useLocalStorage('glass-orders-history', []);
    const [customButtons, setCustomButtons] = useLocalStorage('glass-custom-buttons', DEFAULT_CUSTOM_BUTTONS);

    const addGlassType = (type) => {
        setGlassTypes((prev) => [...prev, { ...type, id: Date.now().toString() }]);
    };

    const updateGlassType = (id, updatedType) => {
        setGlassTypes((prev) => prev.map((t) => (t.id === id ? { ...t, ...updatedType } : t)));
    };

    const deleteGlassType = (id) => {
        setGlassTypes((prev) => prev.filter((t) => t.id !== id));
    };

    const addCustomButton = (button) => {
        setCustomButtons((prev) => [...prev, { ...button, id: Date.now().toString() }]);
    };

    const updateCustomButton = (id, updatedButton) => {
        setCustomButtons((prev) => prev.map((b) => (b.id === id ? { ...b, ...updatedButton } : b)));
    };

    const deleteCustomButton = (id) => {
        setCustomButtons((prev) => prev.filter((b) => b.id !== id));
    };

    const saveOrder = (order) => {
        setOrders(prev => [
            { ...order, id: Date.now().toString(), date: order.date || new Date().toISOString() },
            ...prev
        ]);
    };

    const deleteOrder = (id) => {
        setOrders(prev => prev.filter(o => o.id !== id));
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
        deleteOrder
    };
}
