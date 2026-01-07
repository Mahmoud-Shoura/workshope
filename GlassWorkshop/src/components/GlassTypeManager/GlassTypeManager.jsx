import React from 'react';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { useGlassStore } from '../../hooks/useGlassStore';
import { cn } from '../../lib/utils';
import './GlassTypeManager.css';

export function GlassTypeManager() {
    const { glassTypes, addGlassType, updateGlassType, deleteGlassType } = useGlassStore();
    const [isAdding, setIsAdding] = React.useState(false);
    const [editingId, setEditingId] = React.useState(null);

    const [formData, setFormData] = React.useState({ name: '', price: '', unit: 'm2' });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.price) return;

        if (editingId) {
            updateGlassType(editingId, { ...formData, price: Number(formData.price) });
            setEditingId(null);
        } else {
            addGlassType({ ...formData, price: Number(formData.price) });
            setIsAdding(false);
        }
        setFormData({ name: '', price: '', unit: 'm2' });
    };

    const startEdit = (type) => {
        setFormData({ name: type.name, price: type.price, unit: type.unit });
        setEditingId(type.id);
        setIsAdding(true);
    };

    return (
        <div className="space-y-6 animate-fade-in mx-auto w-full max-w-4xl">
            <div className="flex justify-between items-center bg-card p-4 rounded-xl shadow-sm border">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight">إدارة المخزن</h2>
                <button
                    onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: '', price: '', unit: 'm2' }); }}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 flex items-center shadow-md transition-all"
                >
                    <Plus className="w-4 h-4 ml-2" /> إضافة نوع
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-card border p-6 rounded-xl shadow-md space-y-4 animate-accordion-down">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">الاسم</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full p-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="مثال: شفاف 6 مم"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">السعر (ج.م)</label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                                className="w-full p-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">الوحدة</label>
                            <select
                                value={formData.unit}
                                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                                className="w-full p-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                            >
                                <option value="m2">للمتر المربع (م²)</option>
                                <option value="piece">بالقطعة</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => { setIsAdding(false); setEditingId(null); }}
                            className="px-4 py-2 border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 shadow-sm transition-colors"
                        >
                            {editingId ? 'تحديث' : 'حفظ'}
                        </button>
                    </div>
                </form>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {glassTypes.map((type) => (
                    <div key={type.id} className="bg-card border rounded-xl p-4 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow group">
                        <div>
                            <h3 className="font-bold text-lg">{type.name}</h3>
                            <p className="text-muted-foreground mt-1 text-sm font-mono">
                                {type.price} ج.م <span className="text-xs text-muted-foreground/70">/ {type.unit === 'm2' ? 'م²' : 'قطعة'}</span>
                            </p>
                        </div>
                        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => startEdit(type)}
                                className="p-2 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => deleteGlassType(type.id)}
                                className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
