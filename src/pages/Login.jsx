import { useState } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import { Leaf, Mail, Lock, ArrowRight, X } from 'lucide-react';

const Login = () => {
    const { t, language } = useLanguage();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        alert('Authentication feature coming soon!');
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card fade-in">
                    <div className="login-header">

                        <h2 className="login-title">{isLogin ? t('login.welcomeBack') : t('login.register')}</h2>
                        <p className="login-subtitle">{t('login.subtitle')}</p>
                    </div>

                    <form className="login-form" onSubmit={handleLogin}>
                        <div className="form-group">
                            <label className="form-label">{t('login.email')}</label>
                            <div className="input-with-icon">
                                <Mail size={20} className="input-icon" />
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder={t('login.placeholderEmail')}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">{t('login.password')}</label>
                            <div className="input-with-icon">
                                <Lock size={20} className="input-icon" />
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder={t('login.placeholderPassword')}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {isLogin && (
                            <div className="forgot-password">
                                <a href="#">{t('login.forgotPassword')}</a>
                            </div>
                        )}

                        <button type="submit" className="login-btn">
                            <span>{isLogin ? t('login.signIn') : t('login.register')}</span>
                            <ArrowRight size={20} />
                        </button>
                    </form>

                    <div className="login-divider">
                        <span>{t('login.or')}</span>
                    </div>

                    <div className="social-login">
                        <button className="social-btn google-btn">
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                            {t('login.continueGoogle')}
                        </button>
                    </div>

                    <div className="login-footer">
                        <p>
                            {isLogin ? t('login.noAccount') : 'Already have an account?'}
                            <button onClick={() => setIsLogin(!isLogin)} className="toggle-btn">
                                {isLogin ? t('login.register') : t('login.signIn')}
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
                    margin-bottom: 32px;
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
                }

                .form-input:focus {
                    background: white;
                    border-color: var(--color-primary);
                    box-shadow: 0 0 0 4px rgba(74, 124, 44, 0.1);
                }

                .forgot-password {
                    text-align: right;
                    margin-bottom: 24px;
                }

                .forgot-password a {
                    font-size: 0.9rem;
                    color: var(--color-primary);
                    text-decoration: none;
                    font-weight: 600;
                }

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

                .login-btn:hover {
                    background: var(--color-primary-dark);
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(74, 124, 44, 0.3);
                }

                .login-btn:active {
                    transform: scale(0.98);
                }

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

                .social-login {
                    margin-bottom: 32px;
                }

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

                .social-btn:hover {
                    background: #F9FAFB;
                    border-color: #D1D5DB;
                }

                .social-btn img {
                    width: 20px;
                    height: 20px;
                }

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

                .toggle-btn:hover {
                    text-decoration: underline;
                }

                @media (max-width: 480px) {
                    .login-card {
                        padding: 24px 20px;   /* Reduced from 40px */
                        border-radius: 20px;
                    }
                    
                    .login-title {
                        font-size: 1.4rem;    /* Reduced from 1.5rem */
                    }
                    
                    .login-subtitle {
                        font-size: 0.9rem;    /* Reduced from 1rem */
                    }
                    
                    .form-label {
                        font-size: 0.85rem;   /* Reduced from 0.9rem */
                    }
                    
                    .form-input {
                        padding: 12px 16px 12px 44px;  /* Reduced from 14px */
                        font-size: 0.9rem;    /* Reduced from 1rem */
                    }
                    
                    .login-btn {
                        padding: 14px;        /* Reduced from 16px */
                        font-size: 0.95rem;   /* Reduced from 1rem */
                    }
                    
                    .social-btn {
                        padding: 12px;        /* Reduced from 14px */
                        font-size: 0.9rem;    /* Reduced from 0.95rem */
                    }
                    
                    .login-footer {
                        font-size: 0.9rem;    /* Reduced from 0.95rem */
                    }
                }
            `}</style>
        </div>
    );
};

export default Login;
