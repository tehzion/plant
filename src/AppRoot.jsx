import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { LanguageProvider } from './i18n/i18n.jsx';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import TermsOfUse from './pages/TermsOfUse';
import PrivacyPolicy from './pages/PrivacyPolicy';

import { ScanProvider } from './context/ScanContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationProvider.jsx';

const Home = lazy(() => import('./pages/Home'));
const Results = lazy(() => import('./pages/Results'));
const History = lazy(() => import('./pages/History'));
const Encyclopedia = lazy(() => import('./pages/Encyclopedia'));
const Login = lazy(() => import('./pages/Login'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const MyGap = lazy(() => import('./pages/MyGap'));
const UserGuide = lazy(() => import('./pages/UserGuide'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
    console.log('⚛️ App: Rendering full tree...');
    return (
        <ErrorBoundary>
            <AuthProvider>
                <LanguageProvider>
                    <BrowserRouter>
                        <NotificationProvider>
                            <ScanProvider>
                                <Layout>
                                    <Suspense fallback={<div className="page-loading"><LoadingSpinner /></div>}>
                                        <Routes>
                                            <Route path="/" element={<Home />} />
                                            <Route path="/results/:id" element={<Results />} />
                                            <Route path="/history" element={<History />} />
                                            <Route path="/encyclopedia" element={<Encyclopedia />} />
                                            <Route path="/profile" element={<Login />} />
                                            <Route path="/mygap" element={<MyGap />} />
                                            <Route path="/onboarding" element={<Onboarding />} />
                                            <Route path="/guide" element={<UserGuide />} />
                                            <Route path="/terms" element={<TermsOfUse />} />
                                            <Route path="/privacy" element={<PrivacyPolicy />} />
                                            <Route path="*" element={<NotFound />} />
                                        </Routes>
                                    </Suspense>
                                </Layout>
                            </ScanProvider>
                        </NotificationProvider>
                    </BrowserRouter>
                </LanguageProvider>
            </AuthProvider>
            <style>{`
                .page-loading {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 50vh;
                }
            `}</style>
        </ErrorBoundary>
    );
}

export default App;
