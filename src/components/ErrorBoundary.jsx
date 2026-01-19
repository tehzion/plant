import { Component } from 'react';
import translations from '../i18n/translations';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        if (import.meta.env.DEV) {
            console.error('Error caught by boundary:', error, errorInfo);
        }
    }

    // Helper to get translation without hooks
    getSafeT() {
        try {
            const lang = localStorage.getItem('appLanguage') || 'ms';
            const tObj = translations[lang] || translations.ms;

            return (key) => {
                const keys = key.split('.');
                let value = tObj;
                for (const k of keys) {
                    value = value?.[k];
                }
                // Fallback to English if not found
                if (!value && lang !== 'en') {
                    let enValue = translations.en;
                    for (const k of keys) {
                        enValue = enValue?.[k];
                    }
                    return enValue || key;
                }
                return value || key;
            };
        } catch (e) {
            // Ultimate fallback
            return (key) => key;
        }
    }

    render() {
        if (this.state.hasError) {
            const t = this.getSafeT();

            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    background: 'var(--color-bg-secondary)'
                }}>
                    <div style={{
                        background: 'white',
                        padding: '40px',
                        borderRadius: 'var(--radius-xl)',
                        boxShadow: 'var(--shadow-lg)',
                        maxWidth: '500px',
                        textAlign: 'center'
                    }}>
                        <h2 style={{ color: 'var(--color-primary-dark)', marginBottom: '16px' }}>
                            {t('home.errorBoundaryTitle') || 'Something went wrong'}
                        </h2>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                            {t('home.errorBoundaryMessage') || 'Please refresh the page to try again.'}
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                background: 'var(--color-primary)',
                                color: 'white',
                                border: 'none',
                                padding: '12px 24px',
                                borderRadius: 'var(--radius-lg)',
                                fontSize: 'var(--font-size-base)',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            {t('home.errorBoundaryButton') || 'Refresh Page'}
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

