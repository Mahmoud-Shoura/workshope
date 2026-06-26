import React, { useState } from 'react';
import { useGlassStore } from '../../hooks/useGlassStore';
import './LoginPage.css';

export function LoginPage() {
    const { loginUser, registerUser, registeredUsers } = useGlassStore();
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isFirstUser = !registeredUsers || registeredUsers.length === 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Small delay for UX
        await new Promise(r => setTimeout(r, 400));

        if (mode === 'register') {
            if (!name.trim()) { setError('برجاء إدخال الاسم'); setLoading(false); return; }
            if (password.length < 4) { setError('كلمة المرور يجب أن تكون 4 أحرف على الأقل'); setLoading(false); return; }
            if (password !== confirmPassword) { setError('كلمتا المرور غير متطابقتين'); setLoading(false); return; }
            const result = registerUser(name.trim(), password);
            if (!result.success) setError(result.error);
        } else {
            if (!name.trim() || !password) { setError('برجاء إدخال الاسم وكلمة المرور'); setLoading(false); return; }
            const result = loginUser(name.trim(), password);
            if (!result.success) setError(result.error);
        }

        setLoading(false);
    };

    return (
        <div className="login-overlay">
            {/* Background blobs */}
            <div className="login-blob login-blob-1" />
            <div className="login-blob login-blob-2" />
            <div className="login-blob login-blob-3" />

            <div className="login-card">
                {/* Logo/Brand */}
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
                    <h1 className="login-brand-name">نظام إدارة</h1>
                    <p className="login-brand-sub">نظام إدارة الطلبات والحسابات</p>
                </div>

                {/* Tabs */}
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

                {isFirstUser && mode === 'login' && (
                    <div className="login-notice">
                        <span>👋</span>
                        <p>مرحباً! لا يوجد حسابات بعد. اضغط على "حساب جديد" لإنشاء أول حساب.</p>
                    </div>
                )}

                <form className="login-form" onSubmit={handleSubmit} autoComplete="off">
                    <div className="login-field">
                        <label>اسم المستخدم</label>
                        <div className="login-input-wrapper">
                            <span className="login-input-icon">👤</span>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="أدخل اسمك"
                                autoFocus
                                autoComplete="username"
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
                        ) : (
                            'إنشاء الحساب →'
                        )}
                    </button>
                </form>

                <p className="login-footer-text">
                    {mode === 'login'
                        ? 'ليس لديك حساب؟ '
                        : 'لديك حساب بالفعل؟ '}
                    <button
                        type="button"
                        className="login-switch-link"
                        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                    >
                        {mode === 'login' ? 'أنشئ حساباً' : 'سجل دخولك'}
                    </button>
                </p>
            </div>
        </div>
    );
}
