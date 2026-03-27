import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import UserDashboardPanel from '../components/UserDashboardPanel';

const Login = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { user, signIn, signUp, signInWithGoogle } = useAuth();

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // ─── Already logged in — show full dashboard panel ────────────────────────
    if (user) {
        return (
            <div className="login-page" style={{ alignItems: 'flex-start', paddingTop: '16px' }}>
                <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto' }}>
                    <UserDashboardPanel />
                </div>
            </div>
        );
    }

    // ─── Auth form ────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        try {
            if (isLogin) {
                await signIn(email, password);
                navigate('/');
            } else {
                await signUp(email, password);
                setSuccessMsg(t('login.checkEmail') || 'Account created! Check your email to confirm, then sign in.');
                setIsLogin(true);
                setPassword('');
            }
        } catch (err) {
            const msg = err.message || 'An error occurred';
            if (msg.includes('Invalid login credentials')) {
                setError(t('login.errorInvalidCredentials') || 'Wrong email or password.');
            } else if (msg.includes('already registered') || msg.includes('already been registered')) {
                setError(t('login.errorEmailExists') || 'That email is already registered. Try signing in instead.');
            } else if (msg.includes('Email not confirmed')) {
                setError(t('login.errorEmailNotConfirmed') || 'Please confirm your email first, then sign in.');
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setError('');
        try {
            await signInWithGoogle();
        } catch (err) {
            if (!supabase) {
                setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');
            } else {
                setError(err.message || 'Google sign-in failed.');
            }
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card fade-in">
                    <div className="login-header">
                        <h2 className="login-title">
                            {isLogin ? (t('login.welcomeBack') || 'Welcome Back') : (t('login.register') || 'Create Account')}
                        </h2>
                        <p className="login-subtitle">{t('login.subtitle') || 'Smart Plant Advisor'}</p>
                    </div>

                    {/* Error / success banners */}
                    {error && (
                        <div className="auth-alert auth-alert--error">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}
                    {successMsg && (
                        <div className="auth-alert auth-alert--success">
                            <span>{successMsg}</span>
                        </div>
                    )}

                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">{t('login.email') || 'Email'}</label>
                            <div className="input-with-icon">
                                <Mail size={20} className="input-icon" />
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder={t('login.placeholderEmail') || 'you@example.com'}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">{t('login.password') || 'Password'}</label>
                            <div className="input-with-icon">
                                <Lock size={20} className="input-icon" />
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder={t('login.placeholderPassword') || '••••••••'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    minLength={4}
                                />
                            </div>
                        </div>

                        <button type="submit" className="login-btn" disabled={loading}>
                            {loading
                                ? <span className="btn-spinner" />
                                : <>
                                    <span>{isLogin ? (t('login.signIn') || 'Sign In') : (t('login.register') || 'Register')}</span>
                                    <ArrowRight size={20} />
                                  </>
                            }
                        </button>
                    </form>

                    <div className="login-divider"><span>{t('login.or') || 'or'}</span></div>

                    <div className="social-login">
                        <button className="social-btn google-btn" onClick={handleGoogle} disabled={loading}>
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                            {t('login.continueGoogle') || 'Continue with Google'}
                        </button>
                    </div>

                    <div className="login-footer">
                        <p>
                            {isLogin ? (t('login.noAccount') || "Don't have an account?") : (t('common.alreadyHaveAccount') || 'Already have an account?')}
                            <button onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMsg(''); }} className="toggle-btn">
                                {isLogin ? (t('login.register') || 'Register') : (t('login.signIn') || 'Sign In')}
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                .login-page {
                    min-height: calc(100vh - 70px);
                    background: #F9FAFB;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: var(--space-lg);
                }
                .login-container {
                    width: 100%;
                    max-width: 440px;
                }
                .login-card {
                    background: white;
                    border-radius: 24px;
                    padding: 40px;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.06);
                    border: 1px solid rgba(0,0,0,0.02);
                }
                .login-header {
                    text-align: center;
                    margin-bottom: 24px;
                }
                .login-title {
                    font-size: 1.75rem;
                    color: #1F2937;
                    font-weight: 700;
                    margin-bottom: 8px;
                    letter-spacing: -0.02em;
                }
                .login-subtitle {
                    color: #6B7280;
                    font-size: 1rem;
                }
                .auth-alert {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 16px;
                    border-radius: 12px;
                    font-size: 0.9rem;
                    font-weight: 500;
                    margin-bottom: 16px;
                }
                .auth-alert--error { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }
                .auth-alert--success { background: #F0FDF4; color: #166534; border: 1px solid #D1FAE5; }
                .login-form {
                    margin-bottom: 24px;
                }
                .form-group {
                    margin-bottom: 20px;
                }
                .form-label {
                    display: block;
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 8px;
                }
                .input-with-icon {
                    position: relative;
                }
                .input-icon {
                    position: absolute;
                    left: 16px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #9CA3AF;
                    pointer-events: none;
                }
                .form-input {
                    width: 100%;
                    padding: 14px 16px 14px 48px;
                    border: 1px solid #E5E7EB;
                    border-radius: 12px;
                    font-size: 1rem;
                    transition: all 0.2s ease;
                    outline: none;
                    background: #F9FAFB;
                    color: #1F2937;
                    box-sizing: border-box;
                }
                .form-input:focus {
                    background: white;
                    border-color: var(--color-primary);
                    box-shadow: 0 0 0 4px rgba(74, 124, 44, 0.1);
                }
                .form-input:disabled { opacity: 0.6; cursor: not-allowed; }
                .login-btn {
                    width: 100%;
                    padding: 16px;
                    background: var(--color-primary);
                    color: white;
                    border: none;
                    border-radius: 16px;
                    font-size: 1rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    box-shadow: 0 4px 12px rgba(74, 124, 44, 0.2);
                }
                .login-btn:hover:not(:disabled) {
                    background: var(--color-primary-dark);
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(74, 124, 44, 0.3);
                }
                .login-btn:active { transform: scale(0.98); }
                .login-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
                .btn-spinner {
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255,255,255,0.4);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.7s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                .login-divider {
                    text-align: center;
                    margin: 24px 0;
                    position: relative;
                }
                .login-divider::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 0;
                    width: 100%;
                    height: 1px;
                    background: #E5E7EB;
                    z-index: 1;
                }
                .login-divider span {
                    background: white;
                    padding: 0 16px;
                    color: #9CA3AF;
                    font-size: 0.85rem;
                    font-weight: 600;
                    position: relative;
                    z-index: 2;
                }
                .social-login { margin-bottom: 32px; }
                .social-btn {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    padding: 14px;
                    background: white;
                    border: 1px solid #E5E7EB;
                    border-radius: 16px;
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: #374151;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .social-btn:hover:not(:disabled) { background: #F9FAFB; border-color: #D1D5DB; }
                .social-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                .social-btn img { width: 20px; height: 20px; }
                .login-footer {
                    text-align: center;
                    font-size: 0.95rem;
                    color: #6B7280;
                }
                .toggle-btn {
                    background: none;
                    border: none;
                    color: var(--color-primary);
                    font-weight: 700;
                    margin-left: 8px;
                    cursor: pointer;
                    padding: 0;
                }
                .toggle-btn:hover { text-decoration: underline; }
                @media (max-width: 480px) {
                    .login-card { padding: 24px 20px; border-radius: 20px; }
                    .login-title { font-size: 1.4rem; }
                }
            `}</style>
        </div>
    );
};

export default Login;
