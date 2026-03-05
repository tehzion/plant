import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';

const ServerStatus = ({ status }) => {
    const { t } = useLanguage();

    return (
        <div className={`server-status-banner ${status === 'offline' ? 'status-demo' : 'status-live'} mt-sm fade-in`}>
            {status === 'offline' ? (
                <>
                    <WifiOff size={14} strokeWidth={2} />
                    <span>{t('home.demoModeMsg')}</span>
                </>
            ) : status === 'online' ? (
                <>
                    <div className="status-dot"></div>
                    <Wifi size={14} strokeWidth={2} />
                    <span>{t('home.systemOnline')}</span>
                </>
            ) : (
                <div className="status-loading">
                    <div className="dot-pulse"></div>
                    <span>{t('home.connecting')}</span>
                </div>
            )}
            <style>{`
                .server-status-banner {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                }

                .status-live {
                    background: #ECFDF5;
                    color: #059669;
                    border: 1px solid #D1FAE5;
                }

                .status-demo {
                    background: #FFFBEB;
                    color: #D97706;
                    border: 1px solid #FEF3C7;
                }

                .status-dot {
                    width: 6px;
                    height: 6px;
                    background: #10B981;
                    border-radius: 50%;
                    animation: pulse-dot 2s infinite;
                }

                @keyframes pulse-dot {
                    0% { transform: scale(0.9); opacity: 0.7; }
                    50% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(0.9); opacity: 0.7; }
                }

                .status-loading {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #6B7280;
                }
            `}</style>
        </div>
    );
};

export default ServerStatus;
