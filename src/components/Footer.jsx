import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';

const Footer = () => {
    const location = useLocation();
    const { t } = useLanguage();
    const isHome = location.pathname === '/';

    return (
        <footer className="app-footer">
            <div className="container">
                {isHome && (
                    <div className="footer-links">
                        <Link to="/terms">{t('nav.terms')}</Link>
                        <span className="separator">•</span>
                        <Link to="/privacy">{t('nav.privacy')}</Link>
                    </div>
                )}
                <p>
                    &copy; {new Date().getFullYear()} {t('common.madeInMY')} <span className="my-badge">MY</span>
                    {typeof __APP_VERSION__ !== 'undefined' && (
                        <span className="version-tag"> | {__APP_VERSION__}</span>
                    )}
                </p>
            </div>

            <style>{`
                .app-footer {
                    text-align: center;
                    padding: 16px 0 12px 0;
                    background: white;
                    border-top: 1px solid rgba(0, 0, 0, 0.05);
                    color: #94A3B8;
                    font-size: 0.85rem;
                }

                .footer-links {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 6px;
                }

                .footer-links a {
                    color: #64748B;
                    text-decoration: none;
                    font-size: 0.8rem;
                    font-weight: 500;
                    transition: color 0.2s;
                }

                .footer-links a:hover {
                    color: #00B14F;
                }

                .separator {
                    color: #CBD5E1;
                    font-size: 0.7rem;
                }

                .app-footer p {
                    margin: 0;
                    opacity: 0.8;
                }

                .version-tag {
                    font-size: 0.75rem;
                    opacity: 0.6;
                    margin-left: 4px;
                }

                .my-badge {
                    opacity: 0.5;
                    font-size: 0.8em;
                }

                @media (max-width: 768px) {
                    .app-footer {
                        display: none;
                    }
                }
            `}</style>
        </footer>
    );
};

export default Footer;
