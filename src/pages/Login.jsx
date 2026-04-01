import { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import './Login.css';

const UserDashboardPanel = lazyWithRetry(() => import('../components/UserDashboardPanel'), 'dashboard-panel');

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

    // Already logged in: show the full dashboard panel.
    if (user) {
        return (
            <div className="login-page" style={{ alignItems: 'flex-start', paddingTop: '16px' }}>
                <div style={{ width: '100%', maxWidth: 'var(--width-superapp, 680px)', margin: '0 auto' }}>
                    <Suspense fallback={<div className="page-loading"><LoadingSpinner /></div>}>
                        <UserDashboardPanel />
                    </Suspense>
                </div>
            </div>
        );
    }

    // Authentication form.
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        try {
            if (isLogin) {
                await signIn(email, password);
                navigate('/profile');
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
                        <span className="login-kicker">KANB</span>
                        <h2 className="login-title">
                            {isLogin ? (t('login.welcomeBack') || 'Welcome Back') : (t('login.register') || 'Create Account')}
                        </h2>
                        <p className="login-subtitle">{t('login.subtitle') || 'KANB Agropreneur Nasional'}</p>
                    </div>

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
                                    placeholder={t('login.placeholderPassword') || 'Enter your password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    minLength={4}
                                />
                            </div>
                        </div>

                        <button type="submit" className="login-btn" disabled={loading}>
                            {loading ? (
                                <span className="btn-spinner" />
                            ) : (
                                <>
                                    <span>{isLogin ? (t('login.signIn') || 'Sign In') : (t('login.register') || 'Register')}</span>
                                    <ArrowRight size={20} />
                                </>
                            )}
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
        </div>
    );
};

export default Login;
