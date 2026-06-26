import React, { useState } from 'react';
import { Save, Printer, Sliders, FileText } from 'lucide-react';
import { useGlassStore } from '../../hooks/useGlassStore';
import './Settings.css';

export function Settings() {
    const { printSettings, updatePrintSettings } = useGlassStore();
    const [workshopName, setWorkshopName] = useState(printSettings?.workshopName || 'ورشة الزجاج الحديثة');
    const [ownerName, setOwnerName] = useState(printSettings?.ownerName || '');
    const [taxNumber, setTaxNumber] = useState(printSettings?.taxNumber || '');
    const [address, setAddress] = useState(printSettings?.address || '');
    const [phone, setPhone] = useState(printSettings?.phone || '');
    const [footerNote, setFooterNote] = useState(printSettings?.footerNote || 'نشكركم لتعاملكم معنا - ورشة الزجاج الحديثة للخدمات الفنية');
    
    const [savedSuccessfully, setSavedSuccessfully] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        updatePrintSettings({
            workshopName,
            ownerName,
            taxNumber,
            address,
            phone,
            footerNote
        });
        setSavedSuccessfully(true);
        setTimeout(() => setSavedSuccessfully(false), 3000);
    };

    return (
        <div className="settings-container">
            <div className="settings-header">
                <h2>إعدادات النظام والفاتورة المطبوعة</h2>
                <p className="settings-subtitle">يمكنك هنا تخصيص بيانات الفاتورة المطبوعة والبيانات الضريبية للنشاط التجاري</p>
            </div>

            <div className="settings-layout">
                {/* Form Section */}
                <form onSubmit={handleSubmit} className="settings-form">
                    <div className="settings-card">
                        <div className="card-header">
                            <Sliders className="card-icon" size={20} />
                            <h3>البيانات الأساسية للفاتورة</h3>
                        </div>
                        
                        <div className="form-grid">
                            <div className="form-field full-width">
                                <label>اسم الورشة / المصنع (يظهر في ترويسة الفاتورة)</label>
                                <input
                                    type="text"
                                    value={workshopName}
                                    onChange={(e) => setWorkshopName(e.target.value)}
                                    placeholder="مثال: مصنع زجاج السلام"
                                    required
                                />
                            </div>

                            <div className="form-field">
                                <label>الرقم الضريبي (يظهر في الفاتورة والرسالة)</label>
                                <input
                                    type="text"
                                    value={taxNumber}
                                    onChange={(e) => setTaxNumber(e.target.value)}
                                    placeholder="مثال: 123-456-789"
                                />
                            </div>

                            <div className="form-field">
                                <label>رقم الهاتف للورشة / المصنع</label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="مثال: 010xxxxxxxx"
                                />
                            </div>

                            <div className="form-field">
                                <label>العنوان</label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="مثال: القاهرة، مدينة نصر، شارع الطيران"
                                />
                            </div>

                            <div className="form-field">
                                <label>اسم صاحب العمل / المدير المسؤول</label>
                                <input
                                    type="text"
                                    value={ownerName}
                                    onChange={(e) => setOwnerName(e.target.value)}
                                    placeholder="مثال: أ/ محمد أحمد"
                                />
                            </div>

                            <div className="form-field full-width">
                                <label>ملاحظة التذييل (تظهر في الجزء السفلي للفاتورة)</label>
                                <textarea
                                    value={footerNote}
                                    onChange={(e) => setFooterNote(e.target.value)}
                                    placeholder="شكر وتقدير للعملاء أو شروط الاسترجاع والاستلام..."
                                    rows="3"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="settings-actions">
                        <button type="submit" className="btn-save-settings">
                            <Save size={18} />
                            حفظ الإعدادات
                        </button>
                        {savedSuccessfully && (
                            <span className="save-success-msg">تم حفظ الإعدادات وتحديث الفواتير المطبوعة بنجاح!</span>
                        )}
                    </div>
                </form>

                {/* Print Preview Card */}
                <div className="settings-preview-card">
                    <div className="card-header">
                        <FileText className="card-icon" size={20} />
                        <h3>معاينة حية للترويسة والتذييل</h3>
                    </div>
                    
                    <div className="live-preview-box">
                        <div className="preview-receipt">
                            <div className="preview-receipt-header">
                                <h4>{workshopName || 'اسم الورشة'}</h4>
                                {taxNumber && <p className="tax-badge">الرقم الضريبي: {taxNumber}</p>}
                                <p className="sub-detail">كشف تفصيلي بمقاسات وحسابات زجاج للعميل</p>
                                <div className="header-divider"></div>
                                <div className="preview-info-row">
                                    <span>العميل: أحمد محمد</span>
                                    <span>التاريخ: {new Date().toLocaleDateString('ar-EG')}</span>
                                </div>
                                {phone && <p className="preview-sub-text">الهاتف: {phone}</p>}
                                {address && <p className="preview-sub-text">العنوان: {address}</p>}
                            </div>
                            
                            <div className="preview-receipt-body">
                                <table className="preview-table">
                                    <thead>
                                        <tr>
                                            <th>الصنف</th>
                                            <th>المقاس</th>
                                            <th>المجموع</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>شفاف 6 مم</td>
                                            <td>100 × 80 سم</td>
                                            <td>320 ج.م</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="preview-receipt-footer">
                                <div className="footer-divider"></div>
                                <p className="preview-footer-note">{footerNote || 'ملاحظة أسفل الفاتورة المطبوعة...'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
