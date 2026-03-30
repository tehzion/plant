import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import './Footer.css';

const Footer = () => {
    const location = useLocation();
    const { t } = useLanguage();
    const isHome = location.pathname === '/';

    return (
        <footer className="app-footer">
            <div className="app-footer__shell container">
                {isHome && (
                    <div className="app-footer__links">
                        <Link to="/terms">{t('nav.terms')}</Link>
                        <span className="separator">•</span>
                        <Link to="/privacy">{t('nav.privacy')}</Link>
                    </div>
                )}
                <p className="app-footer__copy">
                    <span>&copy; {new Date().getFullYear()} {t('common.madeInMY')}</span>
                    <span className="my-badge">MY</span>
                    {typeof __APP_VERSION__ !== 'undefined' && (
                        <span className="version-tag">{__APP_VERSION__}</span>
                    )}
                </p>
            </div>
        </footer>
    );
};

export default Footer;
