import React, { useState, useEffect } from 'react';
import { Save, Printer, Sliders, FileText, Users, CreditCard, Check, X, Plus } from 'lucide-react';
import { useGlassStore } from '../../hooks/useGlassStore';
import './Settings.css';

export function Settings() {
    const { 
        printSettings, 
        updatePrintSettings, 
        userRole, 
        subscription, 
        getWorkshopMembers, 
        inviteMember, 
        getPendingPayments, 
        confirmPayment,
        activeWorkshop,
        createWorkshop
    } = useGlassStore();

    const [workshopName, setWorkshopName] = useState(printSettings?.workshop_name || 'ورشة الزجاج الحديثة');
    const [ownerName, setOwnerName] = useState(printSettings?.owner_name || '');
    const [taxNumber, setTaxNumber] = useState(printSettings?.tax_number || '');
    const [address, setAddress] = useState(printSettings?.address || '');
    const [phone, setPhone] = useState(printSettings?.phone || '');
    const [footerNote, setFooterNote] = useState(printSettings?.footer_note || 'نشكركم لتعاملكم معنا - ورشة الزجاج الحديثة للخدمات الفنية');
    
    const [savedSuccessfully, setSavedSuccessfully] = useState(false);
    const [showCreateWorkshop, setShowCreateWorkshop] = useState(!activeWorkshop);
    const [newWorkshopName, setNewWorkshopName] = useState('');
    const [workshopLoading, setWorkshopLoading] = useState(false);
    const [workshopError, setWorkshopError] = useState('');

    // Owner management states
    const [members, setMembers] = useState([]);
    const [pendingPayments, setPendingPayments] = useState([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('employee');
    const [inviteError, setInviteError] = useState('');
    const [inviteSuccess, setInviteSuccess] = useState(false);

    const isOwner = userRole === 'owner';

    useEffect(() => {
        if (isOwner) {
            loadOwnerPanel();
        }
    }, [isOwner]);

    const loadOwnerPanel = async () => {
        const [memList, payList] = await Promise.all([
            getWorkshopMembers(),
            getPendingPayments()
        ]);
        setMembers(memList);
        setPendingPayments(payList);
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        setInviteError('');
        setInviteSuccess(false);

        if (!inviteEmail.trim()) return;

        const res = await inviteMember(inviteEmail.trim(), inviteRole);
        if (res.success) {
            setInviteSuccess(true);
            setInviteEmail('');
            loadOwnerPanel();
        } else {
            setInviteError(res.error || 'فشلت دعوة المستخدم');
        }
    };

    const handleConfirmPayment = async (paymentId, decision) => {
        const res = await confirmPayment(paymentId, decision);
        if (res.success) {
            loadOwnerPanel();
        }
    };

    const handleCreateWorkshop = async (e) => {
        e.preventDefault();
        setWorkshopError('');
        
        if (!newWorkshopName.trim()) {
            setWorkshopError('برجاء إدخال اسم الورشة');
            return;
        }

        setWorkshopLoading(true);
        const result = await createWorkshop(newWorkshopName.trim());
        setWorkshopLoading(false);

        if (result.success) {
            setNewWorkshopName('');
            setShowCreateWorkshop(false);
            setWorkshopName(newWorkshopName.trim());
        } else {
            setWorkshopError(result.error || 'فشل في إنشاء الورشة');
        }
    };

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
            {/* Create Workshop Modal */}
            {showCreateWorkshop && !activeWorkshop && (
                <div className="modal-overlay" onClick={() => !workshopLoading && setShowCreateWorkshop(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>إنشاء ورشة عمل جديدة</h2>
                        </div>
                        <form onSubmit={handleCreateWorkshop} className="modal-form">
                            <div className="form-field">
                                <label>اسم الورشة</label>
                                <input
                                    type="text"
                                    value={newWorkshopName}
                                    onChange={(e) => setNewWorkshopName(e.target.value)}
                                    placeholder="مثال: ورشة الأمل للزجاج"
                                    autoFocus
                                    disabled={workshopLoading}
                                    required
                                />
                            </div>
                            {workshopError && (
                                <p className="error-message" style={{ color: '#d32f2f', marginBottom: '12px' }}>
                                    ⚠️ {workshopError}
                                </p>
                            )}
                            <div className="modal-actions">
                                <button 
                                    type="button" 
                                    className="btn-cancel"
                                    onClick={() => setShowCreateWorkshop(false)}
                                    disabled={workshopLoading}
                                >
                                    إلغاء
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-save-settings"
                                    disabled={workshopLoading}
                                >
                                    {workshopLoading ? 'جاري الإنشاء...' : 'إنشاء الورشة'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="settings-header">
                <h2>إعدادات النظام والفاتورة المطبوعة</h2>
                <p className="settings-subtitle">يمكنك هنا تخصيص بيانات الفاتورة المطبوعة والبيانات الضريبية للنشاط التجاري</p>
                {!activeWorkshop && (
                    <button 
                        className="btn-create-workshop"
                        onClick={() => setShowCreateWorkshop(true)}
                        style={{
                            marginTop: '12px',
                            padding: '10px 16px',
                            background: '#4caf50',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Plus size={18} />
                        إنشاء ورشة جديدة
                    </button>
                )}
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
                                    disabled={userRole === 'employee'}
                                />
                            </div>

                            <div className="form-field">
                                <label>الرقم الضريبي (يظهر في الفاتورة والرسالة)</label>
                                <input
                                    type="text"
                                    value={taxNumber}
                                    onChange={(e) => setTaxNumber(e.target.value)}
                                    placeholder="مثال: 123-456-789"
                                    disabled={userRole === 'employee'}
                                />
                            </div>

                            <div className="form-field">
                                <label>رقم الهاتف للورشة / المصنع</label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="مثال: 010xxxxxxxx"
                                    disabled={userRole === 'employee'}
                                />
                            </div>

                            <div className="form-field">
                                <label>العنوان</label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="مثال: القاهرة، مدينة نصر، شارع الطيران"
                                    disabled={userRole === 'employee'}
                                />
                            </div>

                            <div className="form-field">
                                <label>اسم صاحب العمل / المدير المسؤول</label>
                                <input
                                    type="text"
                                    value={ownerName}
                                    onChange={(e) => setOwnerName(e.target.value)}
                                    placeholder="مثال: أ/ محمد أحمد"
                                    disabled={userRole === 'employee'}
                                />
                            </div>

                            <div className="form-field full-width">
                                <label>ملاحظة التذييل (تظهر في الجزء السفلي للفاتورة)</label>
                                <textarea
                                    value={footerNote}
                                    onChange={(e) => setFooterNote(e.target.value)}
                                    placeholder="شكر وتقدير للعملاء أو شروط الاسترجاع والاستلام..."
                                    rows="3"
                                    disabled={userRole === 'employee'}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="settings-actions">
                        <button type="submit" className="btn-save-settings" disabled={userRole === 'employee'}>
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

            {/* Owner/Subscription Portal (Only visible to Workshop Owner) */}
            {isOwner && (
                <div className="owner-portal-layout">
                    {/* Member Management */}
                    <div className="owner-card">
                        <div className="card-header">
                            <Users className="card-icon" size={20} />
                            <h3>إدارة أعضاء الورشة</h3>
                        </div>

                        <form onSubmit={handleInvite} className="invite-form">
                            <div className="invite-inputs">
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="البريد الإلكتروني للعضو الجديد"
                                    required
                                />
                                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                                    <option value="accountant">محاسب (كامل الصلاحيات المالية)</option>
                                    <option value="employee">عامل (تسجيل مقاسات وطلبات فقط)</option>
                                </select>
                                <button type="submit" className="btn-invite">إرسال دعوة</button>
                            </div>
                            {inviteError && <p className="error-text">⚠️ {inviteError}</p>}
                            {inviteSuccess && <p className="success-text">✔️ تم إرسال الدعوة بنجاح!</p>}
                        </form>

                        <div className="members-list">
                            <h4>الأعضاء الحاليون:</h4>
                            <table>
                                <thead>
                                    <tr>
                                        <th>البريد / المعرف</th>
                                        <th>الدور</th>
                                        <th>الحالة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map(m => (
                                        <tr key={m.id}>
                                            <td style={{ direction: 'ltr', textAlign: 'right' }}>
                                                {m.invited_email || m.user_id}
                                            </td>
                                            <td>
                                                {m.role === 'owner' ? 'المالك' : m.role === 'accountant' ? 'محاسب' : 'عامل'}
                                            </td>
                                            <td>
                                                {m.user_id ? <span className="status-badge active">نشط</span> : <span className="status-badge pending">معلق</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Subscription & Platform Payments (Admin Simulation) */}
                    <div className="owner-card">
                        <div className="card-header">
                            <CreditCard className="card-icon" size={20} />
                            <h3>الاشتراك والتحويلات المعلقة</h3>
                        </div>

                        <div className="current-sub-info">
                            <p>حالة الاشتراك الحالي: 
                                <strong className={`sub-status ${subscription?.status}`}>
                                    {subscription?.status === 'trial' ? 'فترة تجريبية' : subscription?.status === 'active' ? 'نشط' : 'منتهي'}
                                </strong>
                            </p>
                            <p>تاريخ انتهاء الاشتراك: <strong>{subscription ? new Date(subscription.end_date).toLocaleDateString('ar-EG') : 'غير متوفر'}</strong></p>
                        </div>

                        <div className="pending-payments-list">
                            <h4>طلبات التحويل المعلقة للمراجعة (بوابة الإدارة):</h4>
                            {pendingPayments.length === 0 ? (
                                <p className="no-payments">لا يوجد طلبات دفع معلقة حالياً للمراجعة.</p>
                            ) : (
                                <table>
                                    <thead>
                                        <tr>
                                            <th>الورشة</th>
                                            <th>المبلغ</th>
                                            <th>الطريقة</th>
                                            <th>المرجع</th>
                                            <th>الإجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingPayments.map(p => (
                                            <tr key={p.id}>
                                                <td>{p.subscriptions?.workshops?.name}</td>
                                                <td>{p.amount} EGP</td>
                                                <td>{p.method === 'instapay' ? 'InstaPay' : 'Vodafone Cash'}</td>
                                                <td>{p.transaction_ref}</td>
                                                <td className="actions-cell">
                                                    <button onClick={() => handleConfirmPayment(p.id, 'confirmed')} className="btn-approve" title="تأكيد الدفع">
                                                        <Check size={16} />
                                                    </button>
                                                    <button onClick={() => handleConfirmPayment(p.id, 'rejected')} className="btn-reject" title="رفض">
                                                        <X size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
