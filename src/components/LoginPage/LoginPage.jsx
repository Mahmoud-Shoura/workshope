import React, { useState } from 'react';
import { useGlassStore } from '../../hooks/useGlassStore';
import './LoginPage.css';

export function LoginPage() {
    const { loginUser, registerUser, createWorkshop, currentUser, activeWorkshop, loading: storeLoading } = useGlassStore();
    const [mode, setMode] = useState('login'); // 'login' | 'register' | 'create_workshop'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [workshopName, setWorkshopName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'register') {
                if (!email.trim() || !password) {
                    setError('برجاء ملء جميع الحقول');
                    setLoading(false);
                    return;
                }
                if (password.length < 6) {
                    setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
                    setLoading(false);
                    return;
                }
                if (password !== confirmPassword) {
                    setError('كلمتا المرور غير متطابقتين');
                    setLoading(false);
                    return;
                }
                const result = await registerUser(email.trim(), password);
                if (!result.success) {
                    setError(result.error);
                } else {
                    // Check if user is linked to an invited workshop, otherwise ask to create one
                    // Small delay to let DB triggers execute
                    await new Promise(r => setTimeout(r, 1000));
                    setMode('create_workshop');
                }
            } else if (mode === 'login') {
                if (!email.trim() || !password) {
                    setError('برجاء إدخال البريد الإلكتروني وكلمة المرور');
                    setLoading(false);
                    return;
                }
                const result = await loginUser(email.trim(), password);
                if (!result.success) {
                    setError(result.error);
                }
            } else if (mode === 'create_workshop') {
                if (!workshopName.trim()) {
                    setError('برجاء إدخال اسم الورشة');
                    setLoading(false);
                    return;
                }
                const result = await createWorkshop(workshopName.trim());
                if (!result.success) {
                    setError(result.error);
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // If user logged in but has no workshop (and not in create_workshop mode already)
    if (currentUser && !activeWorkshop && mode !== 'create_workshop') {
        setMode('create_workshop');
    }

    return (
        <div className="login-overlay">
            <div className="login-blob login-blob-1" />
            <div className="login-blob login-blob-2" />
            <div className="login-blob login-blob-3" />

            <div className="login-card">
                <div className="login-brand">
                    <div className="login-logo">
                        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="4" y="4" width="40" height="40" rx="10" fill="url(#glassGrad)" opacity="0.15" />
                            <path d="M12 36 L24 12 L36 36 Z" stroke="url(#glassGrad)" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
                            <path d="M16 28 L32 28" stroke="url(#glassGrad)" strokeWidth="2" strokeLinecap="round" />
                            <defs>
                                <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#06b6d4" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <h1 className="login-brand-name">إدارة الورش</h1>
                    <p className="login-brand-sub">نظام إدارة الطلبات والحسابات</p>
                </div>

                {mode !== 'create_workshop' && (
                    <div className="login-tabs">
                        <button
                            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
                            onClick={() => { setMode('login'); setError(''); }}
                            type="button"
                        >
                            تسجيل الدخول
                        </button>
                        <button
                            className={`login-tab ${mode === 'register' ? 'active' : ''}`}
                            onClick={() => { setMode('register'); setError(''); }}
                            type="button"
                        >
                            حساب جديد
                        </button>
                    </div>
                )}

                <form className="login-form" onSubmit={handleSubmit} autoComplete="off">
                    {mode === 'create_workshop' ? (
                        <div className="login-field">
                            <label>اسم ورشتك الجديدة</label>
                            <div className="login-input-wrapper">
                                <span className="login-input-icon">🏭</span>
                                <input
                                    type="text"
                                    value={workshopName}
                                    onChange={e => setWorkshopName(e.target.value)}
                                    placeholder="مثال: ورشة الأمل الحديثة"
                                    autoFocus
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="login-field">
                                <label>البريد الإلكتروني</label>
                                <div className="login-input-wrapper">
                                    <span className="login-input-icon">📧</span>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="yourname@example.com"
                                        autoFocus
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="login-field">
                                <label>كلمة المرور</label>
                                <div className="login-input-wrapper">
                                    <span className="login-input-icon">🔒</span>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="أدخل كلمة المرور"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="login-show-pw"
                                        onClick={() => setShowPassword(v => !v)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                            </div>

                            {mode === 'register' && (
                                <div className="login-field">
                                    <label>تأكيد كلمة المرور</label>
                                    <div className="login-input-wrapper">
                                        <span className="login-input-icon">🔒</span>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            placeholder="أعد إدخال كلمة المرور"
                                            autoComplete="new-password"
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {error && (
                        <div className="login-error">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className={`login-submit-btn ${loading ? 'loading' : ''}`}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="login-spinner" />
                        ) : mode === 'login' ? (
                            'دخول →'
                        ) : mode === 'register' ? (
                            'إنشاء الحساب →'
                        ) : (
                            'تأكيد وإنشاء الورشة →'
                        )}
                    </button>
                </form>

                {mode !== 'create_workshop' && (
                    <p className="login-footer-text">
                        {mode === 'login' ? 'ليس لديك حساب؟ ' : 'لديك حساب بالفعل؟ '}
                        <button
                            type="button"
                            className="login-switch-link"
                            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                        >
                            {mode === 'login' ? 'أنشئ حساباً' : 'سجل دخولك'}
                        </button>
                    </p>
                )}
            </div>
        </div>
    );
}
