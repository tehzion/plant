import { useLocation, Link } from 'react-router-dom';

const Footer = () => {
    const location = useLocation();
    const isHome = location.pathname === '/';

    return (
        <footer className="app-footer">
            <div className="container">
                {isHome && (
                    <div className="footer-links">
                        <Link to="/terms">Terms of Use</Link>
                        <span className="separator">•</span>
                        <Link to="/privacy">Privacy Policy</Link>
                    </div>
                )}
                <p>
                    &copy; {new Date().getFullYear()} Dengan bangganya dibuat di MALAYSIA <span className="my-badge">MY</span>
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

                .my-badge {
                    opacity: 0.5;
                    font-size: 0.8em;
                }

                @media (max-width: 768px) {
                    .app-footer {
                        padding: 12px 0 10px 0;
                    }

                    .footer-links {
                        gap: 8px;
                        margin-bottom: 4px;
                    }

                    .footer-links a {
                        font-size: 0.75rem;
                    }
                }
            `}</style>
        </footer>
    );
};

export default Footer;
