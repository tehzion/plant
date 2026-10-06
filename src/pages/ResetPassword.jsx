import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { AlertCircle, ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import './Login.css';

const ResetPassword = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { user, updatePassword } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (user === null) setError(t('login.resetLinkInvalid'));
    }, [user, t]);

    const submit = async (event) => {
        event.preventDefault();
        setError('');
        if (password.length < 8) {
            setError(t('login.passwordTooShort'));
            return;
        }
        if (password !== confirmation) {
            setError(t('login.passwordMismatch'));
            return;
        }
        setLoading(true);
        try {
            await updatePassword(password);
            setSuccess(true);
            window.setTimeout(() => navigate('/login'), 1200);
        } catch (err) {
            setError(err.message || t('login.passwordUpdateFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card fade-in">
                    <div className="login-header">
                        <span className="login-kicker">KANB</span>
                        <h2 className="login-title">{t('login.resetTitle')}</h2>
                        <p className="login-subtitle">{t('login.resetSubtitle')}</p>
                    </div>
                    {error && <div className="auth-alert auth-alert--error"><AlertCircle size={16} /><span>{error}</span></div>}
                    {success ? (
                        <div className="auth-alert auth-alert--success" role="status">Password updated. Redirecting to sign in…</div>
                    ) : (
                        <form className="login-form" onSubmit={submit}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="new-password">{t('login.newPassword')}</label>
                                <div className="input-with-icon">
                                    <Lock size={20} className="input-icon" />
                                    <input id="new-password" type="password" className="form-input" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading || user === null} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="confirm-password">{t('login.confirmPassword')}</label>
                                <div className="input-with-icon">
                                    <Lock size={20} className="input-icon" />
                                    <input id="confirm-password" type="password" className="form-input" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={loading || user === null} />
                                </div>
                            </div>
                            <button type="submit" className="login-btn" disabled={loading || user === null}>
                                <span>{loading ? t('login.updatingPassword') : t('login.updatePassword')}</span><ArrowRight size={20} />
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
