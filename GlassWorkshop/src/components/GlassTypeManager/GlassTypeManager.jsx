import React from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { useGlassStore } from '../../hooks/useGlassStore';
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
        <div className="inventory-container">
            <div className="inventory-header">
                <h2>إدارة المخزن</h2>
                <button
                    onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: '', price: '', unit: 'm2' }); }}
                    className="btn-add-type"
                >
                    <Plus size={16} /> إضافة نوع
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="inventory-form">
                    <div className="inventory-form-grid">
                        <div className="form-field">
                            <label>الاسم</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="مثال: شفاف 6 مم"
                                autoFocus
                            />
                        </div>
                        <div className="form-field">
                            <label>السعر (ج.م)</label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="form-field">
                            <label>الوحدة</label>
                            <select
                                value={formData.unit}
                                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                            >
                                <option value="m2">للمتر المربع (م²)</option>
                                <option value="piece">بالقطعة</option>
                                <option value="linear_x2">متر طولي ×2</option>
                                <option value="linear_x4">متر طولي ×4</option>
                            </select>
                        </div>
                    </div>
                    <div className="inventory-form-actions">
                        <button
                            type="button"
                            onClick={() => { setIsAdding(false); setEditingId(null); }}
                            className="btn-cancel"
                        >
                            إلغاء
                        </button>
                        <button type="submit" className="btn-submit">
                            {editingId ? 'تحديث' : 'حفظ'}
                        </button>
                    </div>
                </form>
            )}

            <div className="inventory-grid">
                {glassTypes.map((type) => (
                    <div key={type.id} className="inventory-card">
                        <div className="inventory-card-content">
                            <h3>{type.name}</h3>
                            <p>
                                {type.price} ج.م <span>/ {
                                    type.unit === 'm2' ? 'م²' :
                                        type.unit === 'piece' ? 'قطعة' :
                                            type.unit === 'linear_x2' ? 'م.ط ×2' :
                                                'م.ط ×4'
                                }</span>
                            </p>
                        </div>
                        <div className="inventory-card-actions">
                            <button
                                onClick={() => startEdit(type)}
                                className="btn-edit"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => deleteGlassType(type.id)}
                                className="btn-delete-type"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
