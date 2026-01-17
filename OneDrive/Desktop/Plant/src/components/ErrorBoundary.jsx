import { Component } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';

// Wrapper component to access hooks
function ErrorBoundaryWithTranslation(props) {
    const { t } = useLanguage();
    return <ErrorBoundaryInner t={t} {...props} />;
}

class ErrorBoundaryInner extends Component {
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

    render() {
        const { t } = this.props;

        if (this.state.hasError) {
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
                            {t('home.errorBoundaryTitle')}
                        </h2>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                            {t('home.errorBoundaryMessage')}
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
                            {t('home.errorBoundaryButton')}
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundaryWithTranslation;
