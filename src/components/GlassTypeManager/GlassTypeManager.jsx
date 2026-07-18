import React from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { useGlassStore } from '../../hooks/useGlassStore';
import './GlassTypeManager.css';

export function GlassTypeManager() {
    const { 
        glassTypes, 
        addGlassType, 
        updateGlassType, 
        deleteGlassType,
        customButtons,
        addCustomButton,
        updateCustomButton,
        deleteCustomButton,
        activeWorkshop
    } = useGlassStore();

    const [activeTab, setActiveTab] = React.useState('types'); // 'types' | 'buttons'
    const [isAdding, setIsAdding] = React.useState(false);
    const [editingId, setEditingId] = React.useState(null);
    const [saving, setSaving] = React.useState(false);
    const [errorMessage, setErrorMessage] = React.useState('');

    const [formData, setFormData] = React.useState({ name: '', price: '', unit: 'm2' });
    const [buttonFormData, setButtonFormData] = React.useState({ name: '', type: 'discount_percent', value: '' });

    const handleTypeSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.price) return;

        setSaving(true);
        setErrorMessage('');

        const payload = { ...formData, price: Number(formData.price) };
        if (editingId) {
            await updateGlassType(editingId, payload);
            setEditingId(null);
            setIsAdding(false);
        } else {
            const result = await addGlassType(payload);
            if (!result?.success) {
                setErrorMessage(result?.error || 'حدث خطأ أثناء إضافة الصنف');
                setSaving(false);
                return;
            }
            setIsAdding(false);
        }

        setFormData({ name: '', price: '', unit: 'm2' });
        setSaving(false);
    };

    const handleButtonSubmit = async (e) => {
        e.preventDefault();
        if (!buttonFormData.name || !buttonFormData.value) return;

        setSaving(true);
        setErrorMessage('');

        const data = {
            ...buttonFormData,
            value: Number(buttonFormData.value)
        };

        if (editingId) {
            await updateCustomButton(editingId, data);
            setEditingId(null);
            setIsAdding(false);
        } else {
            const result = await addCustomButton(data);
            if (!result?.success) {
                setErrorMessage(result?.error || 'حدث خطأ أثناء إضافة الزر');
                setSaving(false);
                return;
            }
            setIsAdding(false);
        }
        setButtonFormData({ name: '', type: 'discount_percent', value: '' });
        setSaving(false);
    };

    const startEditType = (type) => {
        setFormData({ name: type.name, price: type.price, unit: type.unit });
        setEditingId(type.id);
        setIsAdding(true);
    };

    const startEditButton = (button) => {
        setButtonFormData({ name: button.name, type: button.type, value: button.value });
        setEditingId(button.id);
        setIsAdding(true);
    };

    const getButtonTypeLabel = (type) => {
        switch (type) {
            case 'discount_percent': return 'خصم نسبة مئوية (%)';
            case 'discount_fixed': return 'خصم مبلغ ثابت (ج.م)';
            case 'fee_percent': return 'إضافة نسبة مئوية (%)';
            case 'fee_fixed': return 'إضافة مبلغ ثابت (ج.م)';
            case 'fee_linear_meter': return 'إضافة بالمتر الطولي (م.ط)';
            case 'fee_per_piece': return 'إضافة بالقطعة';
            default: return '';
        }
    };

    const getButtonDisplayValue = (button) => {
        if (button.type.includes('percent')) {
            return `${button.value}%`;
        }
        if (button.type === 'fee_linear_meter') {
            return `${button.value} ج.م / م.ط`;
        }
        if (button.type === 'fee_per_piece') {
            return `${button.value} ج.م / قطعة`;
        }
        return `${button.value} ج.م`;
    };

    return (
        <div className="inventory-container">
            {!activeWorkshop && (
                <div className="inventory-warning" style={{
                    background: '#d32f2f',
                    color: '#fff',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    textAlign: 'center'
                }}>
                    <p>لم يتم تحديد ورشة عمل. يرجى إنشاء ورشة أولاً من خلال صفحة التسجيل.</p>
                </div>
            )}
            <div className="inventory-header">
                <h2>إدارة المخزن والإعدادات</h2>
                <button
                    onClick={() => { 
                        setIsAdding(true); 
                        setEditingId(null); 
                        setFormData({ name: '', price: '', unit: 'm2' });
                        setButtonFormData({ name: '', type: 'discount_percent', value: '' });
                    }}
                    disabled={!activeWorkshop}
                    className="btn-add-type"
                >
                    <Plus size={16} /> {activeTab === 'types' ? 'إضافة صنف جديد' : 'إضافة زر مخصص'}
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="inventory-tabs">
                <button
                    onClick={() => { setActiveTab('types'); setIsAdding(false); setEditingId(null); }}
                    className={`inventory-tab ${activeTab === 'types' ? 'active' : ''}`}
                >
                    الأصناف والمخزن
                </button>
                <button
                    onClick={() => { setActiveTab('buttons'); setIsAdding(false); setEditingId(null); }}
                    className={`inventory-tab ${activeTab === 'buttons' ? 'active' : ''}`}
                >
                    الأزرار والرسوم المخصصة
                </button>
            </div>

            {/* Form for Glass Types */}
            {isAdding && activeTab === 'types' && (
                <form onSubmit={handleTypeSubmit} className="inventory-form">
                    <div className="inventory-form-grid">
                        <div className="form-field">
                            <label>اسم صنف المادة/الخامة</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="مثال: شفاف 6 مم"
                                autoFocus
                                required
                            />
                        </div>
                        <div className="form-field">
                            <label>السعر (ج.م)</label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div className="form-field">
                            <label>الوحدة الحسابية</label>
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
                            onClick={() => { setIsAdding(false); setEditingId(null); setErrorMessage(''); }}
                            className="btn-cancel"
                        >
                            إلغاء
                        </button>
                        <button type="submit" className="btn-submit" disabled={saving}>
                            {saving ? 'جارٍ الحفظ...' : editingId ? 'تحديث' : 'حفظ'}
                        </button>
                    </div>
                    {errorMessage && <p className="inventory-form-error">{errorMessage}</p>}
                </form>
            )}

            {/* Form for Custom Buttons */}
            {isAdding && activeTab === 'buttons' && (
                <form onSubmit={handleButtonSubmit} className="inventory-form">
                    <div className="inventory-form-grid">
                        <div className="form-field">
                            <label>اسم الزر (البيان)</label>
                            <input
                                type="text"
                                value={buttonFormData.name}
                                onChange={(e) => setButtonFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="مثال: خصم خاص، شحن وتوصيل، ضريبة القيمة المضافة"
                                autoFocus
                                required
                            />
                        </div>
                        <div className="form-field">
                            <label>نوع العملية الحسابية</label>
                            <select
                                value={buttonFormData.type}
                                onChange={(e) => setButtonFormData(prev => ({ ...prev, type: e.target.value }))}
                            >
                                <option value="discount_percent">خصم نسبة مئوية (%)</option>
                                <option value="discount_fixed">خصم مبلغ ثابت (ج.م)</option>
                                <option value="fee_percent">رسوم إضافية نسبة مئوية (%)</option>
                                <option value="fee_fixed">رسوم إضافية مبلغ ثابت (ج.م)</option>
                                <option value="fee_linear_meter">رسوم إضافية بالمتر الطولي (ج.م / م.ط)</option>
                                <option value="fee_per_piece">رسوم إضافية بالقطعة (ج.م / قطعة)</option>
                            </select>
                        </div>
                        <div className="form-field">
                            <label>القيمة (النسبة أو المبلغ)</label>
                            <input
                                type="number"
                                value={buttonFormData.value}
                                onChange={(e) => setButtonFormData(prev => ({ ...prev, value: e.target.value }))}
                                placeholder="0.00"
                                required
                            />
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

            {/* Glass Types Grid */}
            {activeTab === 'types' && (
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
                                    onClick={() => startEditType(type)}
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
            )}

            {/* Custom Buttons Grid */}
            {activeTab === 'buttons' && (
                <div className="inventory-grid">
                    {customButtons && customButtons.map((btn) => (
                        <div key={btn.id} className="inventory-card custom-btn-card">
                            <div className="inventory-card-content">
                                <h3>{btn.name}</h3>
                                <div className="btn-type-tag" data-type={btn.type}>
                                    {getButtonTypeLabel(btn.type)}
                                </div>
                                <p className="btn-value-display">
                                    القيمة: <strong>{getButtonDisplayValue(btn)}</strong>
                                </p>
                            </div>
                            <div className="inventory-card-actions">
                                <button
                                    onClick={() => startEditButton(btn)}
                                    className="btn-edit"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => deleteCustomButton(btn.id)}
                                    className="btn-delete-type"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {(!customButtons || customButtons.length === 0) && (
                        <div className="inventory-empty-state">
                            لا توجد أزرار مخصصة بعد. اضغط على "إضافة زر مخصص" في الأعلى لإنشاء أول زر.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
