import { useLocalStorage } from './useLocalStorage';

const DEFAULT_GLASS_TYPES = [
    { id: '1', name: 'Transparent 6mm', price: 400, unit: 'm2' },
    { id: '2', name: 'Fume 6mm', price: 550, unit: 'm2' },
    { id: '3', name: 'Sekkurit 10mm', price: 1200, unit: 'm2' },
];

export function useGlassStore() {
    const [glassTypes, setGlassTypes] = useLocalStorage('glass-types', DEFAULT_GLASS_TYPES);
    const [orders, setOrders] = useLocalStorage('glass-orders-history', []);

    const addGlassType = (type) => {
        setGlassTypes((prev) => [...prev, { ...type, id: Date.now().toString() }]);
    };

    const updateGlassType = (id, updatedType) => {
        setGlassTypes((prev) => prev.map((t) => (t.id === id ? { ...t, ...updatedType } : t)));
    };

    const deleteGlassType = (id) => {
        setGlassTypes((prev) => prev.filter((t) => t.id !== id));
    };

    const saveOrder = (order) => {
        setOrders(prev => [
            { ...order, id: Date.now().toString(), date: new Date().toISOString() },
            ...prev
        ])
    }

    return {
        glassTypes,
        addGlassType,
        updateGlassType,
        deleteGlassType,
        orders,
        saveOrder
    };
}
