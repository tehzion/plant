import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { LanguageProvider, useLanguage } from './i18n/i18n.jsx';
import LanguageSelector from './components/LanguageSelector';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import Footer from './components/Footer';
import { Home as HomeIcon, ClipboardList, BookOpen, User } from 'lucide-react';
import TermsOfUse from './pages/TermsOfUse';
import PrivacyPolicy from './pages/PrivacyPolicy';


const Home = lazy(() => import('./pages/Home'));
const Results = lazy(() => import('./pages/Results'));
const History = lazy(() => import('./pages/History'));
const Encyclopedia = lazy(() => import('./pages/Encyclopedia'));
const Login = lazy(() => import('./pages/Login'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const UserGuide = lazy(() => import('./pages/UserGuide'));

// ... existing code ...



const AppHeader = ({ isHome }) => {
    const { t } = useLanguage();
    const location = useLocation();

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <div className={`app-header ${isHome ? 'is-home' : ''}`}>
            <div className="header-content">
                <Link to="/" className="logo-link">
                    <h1 className="app-logo">🌿 Smart Plant Diseases & Advisor</h1>
                </Link>

                {/* Desktop Navigation */}
                <div className="desktop-nav">
                    <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
                        {t('nav.home')}
                    </Link>
                    <Link to="/history" className={`nav-link ${isActive('/history') ? 'active' : ''}`}>
                        {t('nav.history')}
                    </Link>
                    <Link to="/encyclopedia" className={`nav-link ${isActive('/encyclopedia') ? 'active' : ''}`}>
                        {t('nav.encyclopedia')}
                    </Link>
                    <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>
                        {t('nav.profile')}
                    </Link>
                </div>

                <div className="header-right">
                    <LanguageSelector />
                </div>
            </div>
            <style>{`
                .app-header {
                    position: sticky;
                    top: 0;
                    z-index: 100;
                    background: white;
                    border-bottom: 2px solid var(--color-border-light);
                    padding: var(--space-md) var(--space-lg);
                }

                /* Mobile: Hide header on Home page */
                @media (max-width: 768px) {
                    .app-header.is-home {
                        display: none;
                    }
                }

                .header-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .logo-link {
                    text-decoration: none;
                }

                .app-logo {
                    font-size: var(--font-size-xl);
                    font-weight: 700;
                    color: var(--color-primary-dark);
                    margin: 0;
                    white-space: nowrap;
                }

                .desktop-nav {
                    display: flex;
                    gap: var(--space-xl);
                    margin: 0 var(--space-xl);
                }

                .nav-link {
                    text-decoration: none;
                    color: var(--color-text-secondary);
                    font-weight: 600;
                    font-size: var(--font-size-base);
                    transition: color 0.2s;
                    padding: var(--space-xs) 0;
                    position: relative;
                }

                .nav-link:hover {
                    color: var(--color-primary);
                }

                .nav-link.active {
                    color: var(--color-primary);
                }

                .nav-link.active::after {
                    content: '';
                    position: absolute;
                    bottom: -2px;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: var(--color-primary);
                    border-radius: 2px;
                }

                @media (max-width: 768px) {
                    .app-header {
                        padding: var(--space-sm) var(--space-md);
                    }

                    .app-logo {
                        font-size: var(--font-size-lg);
                    }

                    .desktop-nav {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
};

const BottomNav = () => {
    const location = useLocation();
    const { t } = useLanguage();
    const isHome = location.pathname === '/';

    const isActive = (path) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    };

    // Hide bottom nav on homepage
    if (isHome) {
        return null;
    }

    return (
        <nav className="bottom-nav">
            <div className="bottom-nav-content">
                <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
                    <span className="nav-item-icon"><HomeIcon size={24} /></span>
                    <span>{t('nav.home')}</span>
                </Link>
                <Link to="/history" className={`nav-item ${isActive('/history') ? 'active' : ''}`}>
                    <span className="nav-item-icon"><ClipboardList size={24} /></span>
                    <span>{t('nav.history')}</span>
                </Link>
                <Link to="/encyclopedia" className={`nav-item ${isActive('/encyclopedia') ? 'active' : ''}`}>
                    <span className="nav-item-icon"><BookOpen size={24} /></span>
                    <span>{t('nav.encyclopedia')}</span>
                </Link>
                <Link to="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
                    <span className="nav-item-icon"><User size={24} /></span>
                    <span>{t('nav.profile')}</span>
                </Link>
            </div>
            <div className="persistent-footer">
                <p>&copy; {new Date().getFullYear()} Dengan bangganya dibuat di MALAYSIA <span className="my-badge">MY</span></p>
            </div>
        </nav>
    );
};

function Layout({ children }) {
    const location = useLocation();
    const isHome = location.pathname === '/';

    const isLegalPage = ['/terms', '/privacy'].some(path => location.pathname.startsWith(path));

    return (
        <div className="app">
            {!isLegalPage && <AppHeader isHome={isHome} />}
            <div className="main-content">
                {children}
            </div>
            {!isLegalPage && <Footer />}
            {!isLegalPage && <BottomNav />}
        </div>
    );
}

function App() {
    return (
        <LanguageProvider>
            <ErrorBoundary>
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <Layout>
                        <Suspense fallback={<div className="page-loading"><LoadingSpinner /></div>}>
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/results/:id" element={<Results />} />
                                <Route path="/history" element={<History />} />
                                <Route path="/encyclopedia" element={<Encyclopedia />} />
                                <Route path="/profile" element={<Login />} />
                                <Route path="/onboarding" element={<Onboarding />} />
                                <Route path="/guide" element={<UserGuide />} />
                                <Route path="/terms" element={<TermsOfUse />} />
                                <Route path="/privacy" element={<PrivacyPolicy />} />
                            </Routes>
                        </Suspense>
                    </Layout>
                </BrowserRouter>
            </ErrorBoundary>
            <style>{`
                .page-loading {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 50vh;
                }
            `}</style>
        </LanguageProvider>
    );
}


// Export App component
export default App;
