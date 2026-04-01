import { Component } from 'react';
import translations from '../i18n/translations';
import { isRetryableLazyLoadError } from '../utils/lazyWithRetry';
import './ErrorBoundary.css';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    componentDidMount() {
        try {
            sessionStorage.removeItem('error-boundary-reload');
        } catch {
            // Ignore storage failures.
        }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);

        if (typeof window === 'undefined') return;

        const retryKey = 'error-boundary-reload';
        if (isRetryableLazyLoadError(error)) {
            try {
                const hasRetried = sessionStorage.getItem(retryKey) === '1';
                if (!hasRetried) {
                    sessionStorage.setItem(retryKey, '1');
                    window.location.reload();
                    return;
                }
            } catch {
                window.location.reload();
                return;
            }
        }

        try {
            sessionStorage.removeItem(retryKey);
        } catch {
            // Ignore storage failures.
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
            let showDetails = false;
            try {
                showDetails = import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug');
            } catch (e) {
                showDetails = import.meta.env.DEV;
            }

            return (
                <div className="error-boundary-shell">
                    <div className="error-boundary-card">
                        <h2 className="error-boundary-title">
                            {t('home.errorBoundaryTitle') || 'Something went wrong'}
                        </h2>
                        <p className="error-boundary-message">
                            {t('home.errorBoundaryMessage') || 'Please refresh the page to try again.'}
                        </p>
                        {showDetails && (
                            <div className="error-boundary-details">
                                <div className="error-boundary-details-title">{t('common.errorDetails')}</div>
                                <div className="error-boundary-details-copy">
                                    {this.state.error?.message || String(this.state.error)}
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="error-boundary-btn"
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

