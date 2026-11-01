import { Suspense, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { Mail, Lock, ArrowRight, AlertCircle, ClipboardList, Sprout, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { peekFollowUpDraft } from '../utils/scanFollowUpDraft.js';
import './Login.css';

const UserDashboardPanel = lazyWithRetry(() => import('../components/UserDashboardPanel'), 'dashboard-panel');

const Login = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { user, signIn, signUp, resetPasswordForEmail, demoAuthEnabled } = useAuth();
    const label = (key, fallback) => {
        const translated = t(key);
        return translated && translated !== key ? translated : fallback;
    };

    const [isLogin, setIsLogin] = useState(true);
    const [isRecovery, setIsRecovery] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const hasPendingFollowUp = !user && Boolean(peekFollowUpDraft());
    // "My farm" is a bottom tab, so a signed-out farmer lands here without
    // asking to sign in. Say what an account is for before showing the form.
    const isFarmTab = pathname === '/profile';
    const [showAuthForm, setShowAuthForm] = useState(() => !isFarmTab || hasPendingFollowUp);

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
            if (isRecovery) {
                try {
                    await resetPasswordForEmail(email);
                } catch (recoveryError) {
                    // Do not disclose whether an address exists.
                    if (!String(recoveryError?.message || '').includes('not configured')) {
                        // The same neutral message is shown for provider errors.
                    } else {
                        throw recoveryError;
                    }
                }
                setSuccessMsg(t('login.recoverySent'));
                setError('');
                return;
            }
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

    const openAuthForm = (signIn) => {
        setIsLogin(signIn);
        setIsRecovery(false);
        setShowAuthForm(true);
    };

    const guestExit = isFarmTab && (
        <div className="farm-intro-guest">
            <button type="button" className="farm-intro-guest-btn" onClick={() => navigate('/')}>
                {t('login.farmIntroGuest')}
            </button>
            <p>{t('login.farmIntroGuestNote')}</p>
        </div>
    );

    if (!showAuthForm) {
        const benefits = [
            { icon: Sprout, text: t('login.farmIntroPlots') },
            { icon: ClipboardList, text: t('login.farmIntroLogs') },
            { icon: History, text: t('login.farmIntroHistory') },
        ];

        return (
            <div className="login-page">
                <div className="login-container">
                    <section className="login-card farm-intro" aria-labelledby="farm-intro-title">
                        <div className="login-header">
                            <h1 id="farm-intro-title" className="login-title">{t('login.farmIntroTitle')}</h1>
                            <p className="login-subtitle">{t('login.farmIntroSubtitle')}</p>
                        </div>

                        <ul className="farm-intro-list">
                            {benefits.map(({ icon: Icon, text }) => (
                                <li key={text}>
                                    <Icon size={20} aria-hidden="true" />
                                    <span>{text}</span>
                                </li>
                            ))}
                        </ul>

                        <button type="button" className="login-btn" onClick={() => openAuthForm(true)}>
                            <span>{t('login.signIn') || 'Sign In'}</span>
                            <ArrowRight size={20} aria-hidden="true" />
                        </button>
                        <button type="button" className="farm-intro-register" onClick={() => openAuthForm(false)}>
                            {t('login.register') || 'Create Account'}
                        </button>

                        {guestExit}
                    </section>
                </div>
            </div>
        );
    }

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card fade-in">
                    <div className="login-header">
                        <h2 className="login-title">
                            {isRecovery ? t('login.recoveryTitle') : isLogin ? (t('login.welcomeBack') || 'Welcome Back') : (t('login.register') || 'Create Account')}
                        </h2>
                        <p className="login-subtitle">{isRecovery ? t('login.recoverySubtitle') : t('login.subtitle') || 'KANB Agropreneur Nasional'}</p>
                    </div>

                    {hasPendingFollowUp && (
                        <div className="auth-alert auth-alert--info">
                            <ClipboardList size={16} />
                            <span>
                                {label(
                                    'login.scanFollowUpWaiting',
                                    'Your scan follow-up log is ready. Sign in or use the demo account to review and save it.',
                                )}
                            </span>
                        </div>
                    )}

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
                                    required={!isRecovery}
                                    hidden={isRecovery}
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
                                    <span>{isRecovery ? t('login.sendResetLink') : isLogin ? (t('login.signIn') || 'Sign In') : (t('login.register') || 'Register')}</span>
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    {isLogin && (
                        <button type="button" className="toggle-btn" onClick={() => { setIsRecovery(true); setError(''); setSuccessMsg(''); }}>
                            {t('login.forgotPassword') || 'Forgot Password?'}
                        </button>
                    )}

                    {demoAuthEnabled && <div className="auth-alert auth-alert--info auth-alert--compact">
                        <span>
                            {label(
                                'login.demoAccountHint',
                                'Development demo: sign in with test@test.com and Test321@.',
                            )}
                        </span>
                    </div>}

                    {guestExit}

                    <div className="login-footer">
                        <p>
                            {isRecovery ? t('login.rememberedPassword') : isLogin ? (t('login.noAccount') || "Don't have an account?") : (t('common.alreadyHaveAccount') || 'Already have an account?')}
                            <button onClick={() => { setIsRecovery(false); setIsLogin(isRecovery ? true : !isLogin); setError(''); setSuccessMsg(''); }} className="toggle-btn">
                                {isRecovery ? 'Sign In' : isLogin ? (t('login.register') || 'Register') : (t('login.signIn') || 'Sign In')}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
