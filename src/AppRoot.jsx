import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense } from 'react';
import { LanguageProvider } from './i18n/i18n.jsx';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import TermsOfUse from './pages/TermsOfUse';
import PrivacyPolicy from './pages/PrivacyPolicy';

import { ScanProvider } from './context/ScanContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationProvider.jsx';
import { lazyWithRetry } from './utils/lazyWithRetry';

const Home = lazyWithRetry(() => import('./pages/Home'), 'home');
const Results = lazyWithRetry(() => import('./pages/Results'), 'results');
const History = lazyWithRetry(() => import('./pages/History'), 'history');
const Encyclopedia = lazyWithRetry(() => import('./pages/Encyclopedia'), 'encyclopedia');
const Login = lazyWithRetry(() => import('./pages/Login'), 'login');
const Onboarding = lazyWithRetry(() => import('./pages/Onboarding'), 'onboarding');
const MyGap = lazyWithRetry(() => import('./pages/MyGap'), 'mygap');
const UserGuide = lazyWithRetry(() => import('./pages/UserGuide'), 'guide');
const NotFound = lazyWithRetry(() => import('./pages/NotFound'), 'notfound');

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
