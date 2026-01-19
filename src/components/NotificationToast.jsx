import React, { useEffect } from 'react';
import { X, CheckCircle, Info, ArrowRight } from 'lucide-react';

const NotificationToast = ({ notification, onClose, onAction }) => {
    useEffect(() => {
        if (notification && notification.duration) {
            const timer = setTimeout(onClose, notification.duration);
            return () => clearTimeout(timer);
        }
    }, [notification, onClose]);

    if (!notification) return null;

    const { type = 'info', message, actionLabel } = notification;

    const bgColors = {
        success: '#F0FDF4', // Very light green
        error: '#FEF2F2',
        info: '#F0FDF4' // Ensure info matches the green theme too (Analysis Running)
    };

    const borderColors = {
        success: '#22C55E', // Green-500
        error: '#EF4444',
        info: '#22C55E' // consistent green border
    };

    const icons = {
        success: <CheckCircle size={24} color="#16A34A" />, // Green-600
        error: <Info size={24} color="#EF4444" />,
        info: <Info size={24} color="#16A34A" /> // Green info icon
    };

    return (
        <div className={`notification-toast slide-up type-${type}`}>
            <div className="notification-content">
                <div className="notification-icon">
                    {icons[type]}
                </div>
                <div className="notification-message">
                    {message}
                </div>
                {actionLabel && (
                    <button className="notification-action" onClick={onAction}>
                        {actionLabel} <ArrowRight size={16} />
                    </button>
                )}
                <button className="notification-close" onClick={onClose}>
                    <X size={18} />
                </button>
            </div>

            <style>{`
                .notification-toast {
                    position: fixed;
                    top: 24px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 2000;
                    width: 90%;
                    max-width: 420px;
                    background: white;
                    border: 1px solid ${borderColors[type]};
                    border-radius: 16px;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    background-color: ${bgColors[type]};
                    padding: 12px 16px;
                    animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .notification-message {
                    flex: 1;
                    font-size: 0.95rem;
                    color: var(--color-text-primary);
                    font-weight: 600;
                    line-height: 1.4;
                }

                .notification-action {
                    background: white;
                    border: 1px solid ${borderColors[type]};
                    color: ${type === 'success' ? '#16A34A' : 'var(--color-text-primary)'};
                    padding: 6px 12px;
                    border-radius: 9999px; /* Pill shape */
                    font-size: 0.85rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-weight: 700;
                    transition: all 0.2s;
                    white-space: nowrap;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }
                
                .notification-action:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                    background: ${type === 'success' ? '#DCFCE7' : '#F3F4F6'};
                }

                .notification-close {
                    background: none;
                    border: none;
                    color: #6B7280;
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: background 0.2s;
                    margin-left: 4px;
                }

                .notification-close:hover {
                    background: rgba(0,0,0,0.05);
                    color: #374151;
                }

                @keyframes slideDown {
                    from { transform: translate(-50%, -100%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default NotificationToast;
