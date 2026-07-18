import React, { useState } from 'react';
import { useGlassStore } from '../../hooks/useGlassStore';
import './SubscriptionBlock.css';

export function SubscriptionBlock() {
    const { orders, subscription, submitPayment, logoutUser } = useGlassStore();
    const [selectedPlan, setSelectedPlan] = useState(null); // 'weekly' | 'monthly' | 'yearly'
    const [paymentMethod, setPaymentMethod] = useState(null); // 'instapay' | 'vodafone_cash'
    const [refNumber, setRefNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const PLANS = {
        weekly: { id: 'weekly', name: 'الخطة الأسبوعية', price: 500 },
        monthly: { id: 'monthly', name: 'الخطة الشهرية', price: 1000 },
        yearly: { id: 'yearly', name: 'الخطة السنوية', price: 9500 },
    };

    // Calculate usage stats
    const totalOrders = orders.length;
    const totalValue = orders.reduce((sum, o) => sum + Number(o.total_cost || 0), 0);
    const totalDeposits = orders.reduce((sum, o) => sum + Number(o.deposit || 0), 0);

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPlan || !paymentMethod || !refNumber.trim()) {
            setError('برجاء ملء جميع الحقول المطلوبة');
            return;
        }

        setLoading(true);
        setError('');
        
        const planDetails = PLANS[selectedPlan];
        const res = await submitPayment(
            subscription.id,
            planDetails.price,
            paymentMethod,
            refNumber.trim()
        );

        setLoading(false);
        if (res.success) {
            setSuccess(true);
        } else {
            setError(res.error || 'حدث خطأ أثناء إرسال طلب الدفع');
        }
    };

    if (success) {
        return (
            <div className="sub-overlay">
                <div className="sub-card text-center">
                    <div className="success-icon">⏳</div>
                    <h2>تم إرسال طلب الاشتراك بنجاح!</h2>
                    <p className="success-msg">
                        لقد سجلنا طلب الدفع الخاص بك بنظام (<strong>{PLANS[selectedPlan].name}</strong>) بقيمة {PLANS[selectedPlan].price} جنيه عبر {paymentMethod === 'instapay' ? 'InstaPay' : 'Vodafone Cash'}.
                        <br /><br />
                        جاري مراجعة التحويل وتأكيد الاشتراك لتفعيل حسابك تلقائياً خلال دقائق.
                    </p>
                    <button className="sub-logout-btn" onClick={logoutUser}>تسجيل الخروج</button>
                </div>
            </div>
        );
    }

    return (
        <div className="sub-overlay">
            <div className="sub-card">
                <div className="sub-header">
                    <h2>⚠️ انتهت الفترة التجريبية (7 أيام)</h2>
                    <p>للاستمرار في استخدام النظام والوصول إلى بيانات ورشتك، يرجى اختيار إحدى خطط الاشتراك التالية وتأكيد الدفع.</p>
                </div>

                {/* Usage Report */}
                <div className="usage-report">
                    <h3>📊 ملخص نشاطك خلال الأسبوع التجريبي:</h3>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-val">{totalOrders}</span>
                            <span className="stat-label">إجمالي الطلبات</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-val">{totalValue} EGP</span>
                            <span className="stat-label">قيمة المبيعات المسجلة</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-val">{totalDeposits} EGP</span>
                            <span className="stat-label">العربين المستلمة</span>
                        </div>
                    </div>
                </div>

                {/* Plans Selection */}
                {!selectedPlan ? (
                    <div className="plans-selection">
                        <h3>اختر خطتك المفضلة:</h3>
                        <div className="sub-plans-list">
                            <div className="sub-plan-item" onClick={() => setSelectedPlan('weekly')}>
                                <h4>أسبوعية</h4>
                                <p className="sub-plan-price">500 EGP</p>
                                <span className="choose-btn">اختر الخطة</span>
                            </div>
                            <div className="sub-plan-item best-value" onClick={() => setSelectedPlan('monthly')}>
                                <span className="best-tag">الأكثر طلباً</span>
                                <h4>شهرية</h4>
                                <p className="sub-plan-price">1000 EGP</p>
                                <span className="choose-btn">اختر الخطة</span>
                            </div>
                            <div className="sub-plan-item" onClick={() => setSelectedPlan('yearly')}>
                                <h4>سنوية</h4>
                                <p className="sub-plan-price">9500 EGP</p>
                                <span className="choose-btn">اختر الخطة</span>
                            </div>
                        </div>
                        <button className="sub-logout-btn" onClick={logoutUser}>تسجيل الخروج</button>
                    </div>
                ) : (
                    /* Payment Steps */
                    <form className="payment-form" onSubmit={handlePaymentSubmit}>
                        <div className="form-header">
                            <button type="button" className="back-btn" onClick={() => { setSelectedPlan(null); setPaymentMethod(null); }}>← تغيير الخطة</button>
                            <h3>الخطة المحددة: <span className="plan-name">{PLANS[selectedPlan].name} ({PLANS[selectedPlan].price} EGP)</span></h3>
                        </div>

                        <div className="payment-methods">
                            <h4>اختر طريقة الدفع:</h4>
                            <div className="method-options">
                                <label className={`method-label ${paymentMethod === 'instapay' ? 'active' : ''}`}>
                                    <input type="radio" name="method" value="instapay" onChange={() => setPaymentMethod('instapay')} />
                                    <span>InstaPay (انستا باي)</span>
                                </label>
                                <label className={`method-label ${paymentMethod === 'vodafone_cash' ? 'active' : ''}`}>
                                    <input type="radio" name="method" value="vodafone_cash" onChange={() => setPaymentMethod('vodafone_cash')} />
                                    <span>Vodafone Cash (فودافون كاش)</span>
                                </label>
                            </div>
                        </div>

                        {paymentMethod && (
                            <div className="payment-instructions">
                                <h4>معلومات التحويل:</h4>
                                {paymentMethod === 'instapay' ? (
                                    <div className="instructions-box">
                                        <p>يرجى تحويل مبلغ <strong>{PLANS[selectedPlan].price} جنيه</strong> إلى عنوان انستا باي التالي:</p>
                                        <p className="payment-ref"><strong>workshop@instapay</strong></p>
                                    </div>
                                ) : (
                                    <div className="instructions-box">
                                        <p>يرجى تحويل مبلغ <strong>{PLANS[selectedPlan].price} جنيه</strong> إلى رقم فودافون كاش التالي:</p>
                                        <p className="payment-ref"><strong>01012345678</strong></p>
                                    </div>
                                )}

                                <div className="input-group">
                                    <label>أدخل رقم المعاملة أو رقم الهاتف المحول منه لتأكيد التحويل:</label>
                                    <input
                                        type="text"
                                        value={refNumber}
                                        onChange={(e) => setRefNumber(e.target.value)}
                                        placeholder="مثال: 0100xxxxxxx أو رقم العملية 202611..."
                                        required
                                    />
                                </div>

                                {error && <p className="error-text">⚠️ {error}</p>}

                                <button type="submit" className="submit-pay-btn" disabled={loading}>
                                    {loading ? 'جاري إرسال الطلب...' : 'تأكيد إرسال التحويل الدفع'}
                                </button>
                            </div>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}
