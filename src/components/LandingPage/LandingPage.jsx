import React from 'react';
import './LandingPage.css';

export function LandingPage({ onGetStarted }) {
    return (
        <div className="landing-container">
            {/* Nav */}
            <nav className="landing-nav">
                <div className="landing-logo-container">
                    <div className="landing-logo">💎</div>
                    <span className="landing-brand">إدارة الورش</span>
                </div>
                <button className="landing-nav-btn" onClick={onGetStarted}>دخول / تسجيل</button>
            </nav>

            {/* Hero */}
            <section className="landing-hero">
                <div className="landing-hero-content">
                    <span className="landing-badge">🔥 ابدأ مجاناً لمدة 7 أيام بدون كارت ائتمان</span>
                    <h1 className="landing-title">إدارة حسابات وطلبات <br /><span className="text-gradient">ورش التصنيع بسهولة</span></h1>
                    <p className="landing-subtitle">
                        نظام متكامل صمم خصيصاً لأصحاب الورش والمصانع لإدارة عمليات التصنيع والتقطيع، حساب المساحات، متابعة فواتير العملاء، وإدارة المقبوضات والمدفوعات اليومية بدقة فائقة.
                    </p>
                    <div className="landing-cta-group">
                        <button className="landing-cta-primary" onClick={onGetStarted}>ابدأ التجربة المجانية الآن ←</button>
                        <a href="#plans" className="landing-cta-secondary">مشاهدة خطط الأسعار</a>
                    </div>
                </div>
                <div className="landing-hero-visual">
                    <div className="glass-card-3d">
                        <h3>طلب توريد رقم #5024</h3>
                        <div className="glass-card-line"></div>
                        <p>العميل: شركة الأمل للمقاولات</p>
                        <p>النوع: صنف قياسي ممتاز 10 مم</p>
                        <p>المقاس: 120 × 240 سم</p>
                        <div className="glass-card-status">قيد التصنيع</div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="landing-features">
                <h2 className="section-title">لماذا تختار تطبيق إدارة الورش؟</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">📏</div>
                        <h3>حسابات وتقطيع دقيق</h3>
                        <p>احسب المساحات بالمتر المربع تلقائياً وتفادى هدر خامات التشغيل بفضل حاسبة القياسات الذكية.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">💸</div>
                        <h3>إدارة مالية كاملة</h3>
                        <p>سجل العربون والمتبقي على كل طلب وراقب الأرباح اليومية والشهرية مع تقارير محاسبية مفصلة.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">👥</div>
                        <h3>تعدد المستخدمين والصلاحيات</h3>
                        <p>أضف محاسبين أو عمال لورشتك بصلاحيات محددة. العمال يضيفون القياسات والمالك يرى التقارير المالية والفوترة.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🔄</div>
                        <h3>مزامنة سحابية كاملة</h3>
                        <p>افتح التطبيق من هاتفك في موقع العمل أو من الكمبيوتر في المكتب. بياناتك متزامنة لحظياً وبأمان تام.</p>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="plans" className="landing-pricing">
                <h2 className="section-title">خطط أسعار مرنة ومناسبة لعملك</h2>
                <p className="pricing-desc">جميع الخطط تشمل فترة تجريبية مجانية لمدة 7 أيام بكامل الصلاحيات</p>
                <div className="plans-grid">
                    <div className="plan-card">
                        <span className="plan-badge">أسبوعي</span>
                        <h3>الخطة الأسبوعية</h3>
                        <div className="plan-price">500 <span className="currency">جنيه مصري</span></div>
                        <ul className="plan-features">
                            <li>✔️ تجربة مجانية 7 أيام</li>
                            <li>✔️ حسابات وطلبات غير محدودة</li>
                            <li>✔️ إضافة حتى 2 موظفين</li>
                            <li>✔️ مزامنة بين الأجهزة</li>
                        </ul>
                        <button className="plan-btn" onClick={onGetStarted}>اختر الخطة الأسبوعية</button>
                    </div>
                    <div className="plan-card featured">
                        <span className="plan-badge-featured">الأكثر شعبية</span>
                        <span className="plan-badge">شهري</span>
                        <h3>الخطة الشهرية</h3>
                        <div className="plan-price">1000 <span className="currency">جنيه مصري</span></div>
                        <ul className="plan-features">
                            <li>✔️ تجربة مجانية 7 أيام</li>
                            <li>✔️ حسابات وطلبات غير محدودة</li>
                            <li>✔️ إضافة عدد غير محدود من الموظفين</li>
                            <li>✔️ تقارير مالية تفصيلية للمالك</li>
                            <li>✔️ دعم فني متميز</li>
                        </ul>
                        <button className="plan-btn featured" onClick={onGetStarted}>اختر الخطة الشهرية</button>
                    </div>
                    <div className="plan-card">
                        <span className="plan-badge">سنوي</span>
                        <h3>الخطة السنوية</h3>
                        <div className="plan-price">9500 <span className="currency">جنيه مصري</span></div>
                        <span className="save-badge">توفير أكثر من 20%</span>
                        <ul className="plan-features">
                            <li>✔️ تجربة مجانية 7 أيام</li>
                            <li>✔️ كل مميزات الخطة الشهرية</li>
                            <li>✔️ توفير كبير مقارنة بالدفع الشهري</li>
                            <li>✔️ أولوية الدعم الفني وتحديثات حصرية</li>
                        </ul>
                        <button className="plan-btn" onClick={onGetStarted}>اختر الخطة السنوية</button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <p>© {new Date().getFullYear()} نظام إدارة الورش. جميع الحقوق محفوظة.</p>
            </footer>
        </div>
    );
}
