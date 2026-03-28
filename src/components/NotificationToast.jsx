import React from 'react';
import { X, CheckCircle, Info, AlertTriangle, ArrowRight } from 'lucide-react';

// ─── Theme maps ───────────────────────────────────────────────────────────────
const THEME = {
    success: {
        bg:     '#F0FDF4',
        border: '#22C55E',
        icon:   <CheckCircle size={22} color="#16A34A" />,
    },
    error: {
        bg:     '#FEF2F2',
        border: '#EF4444',
        icon:   <AlertTriangle size={22} color="#EF4444" />,
    },
    warning: {
        bg:     '#FFFBEB',
        border: '#F59E0B',
        icon:   <AlertTriangle size={22} color="#D97706" />,
    },
    info: {
        bg:     '#EFF6FF',
        border: '#3B82F6',
        icon:   <Info size={22} color="#2563EB" />,
    },
};

// ─── Component ────────────────────────────────────────────────────────────────
// Note: auto-dismiss timing is now handled entirely by NotificationProvider.
// This component is purely presentational.
const NotificationToast = ({ notification, onClose, onAction }) => {
    if (!notification) return null;

    const { type = 'info', message, actionLabel } = notification;
    const theme = THEME[type] ?? THEME.info;

    return (
        <div className={`notification-toast type-${type}`} role="alert" aria-live="assertive">
            <div className="notification-content">
                <div className="notification-icon" aria-hidden="true">
                    {theme.icon}
                </div>

                <p className="notification-message">{message}</p>

                {actionLabel && (
                    <button
                        className="notification-action"
                        onClick={onAction}
                        style={{ borderColor: theme.border }}
                    >
                        {actionLabel} <ArrowRight size={14} />
                    </button>
                )}

                <button
                    className="notification-close"
                    onClick={onClose}
                    aria-label="Dismiss notification"
                >
                    <X size={16} />
                </button>
            </div>

            <style>{`
                .notification-toast {
                    position: fixed;
                    top: 24px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 2000;
                    width: 92%;
                    max-width: 440px;
                    border-radius: 16px;
                    padding: 13px 16px;
                    border: 1.5px solid ${theme.border};
                    background-color: ${theme.bg};
                    box-shadow:
                        0 10px 25px -5px rgba(0,0,0,0.10),
                        0 4px 10px -3px rgba(0,0,0,0.06);
                    animation: toastSlideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .notification-icon {
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                }

                .notification-message {
                    flex: 1;
                    font-size: 0.88rem;
                    color: #0f172a;
                    font-weight: 600;
                    line-height: 1.45;
                    margin: 0;
                }

                .notification-action {
                    flex-shrink: 0;
                    background: white;
                    border: 1.5px solid;
                    padding: 5px 12px;
                    border-radius: 999px;
                    font-size: 0.78rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-weight: 700;
                    color: #0f172a;
                    transition: all 0.15s;
                    white-space: nowrap;
                }
                .notification-action:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 3px 8px rgba(0,0,0,0.08);
                }

                .notification-close {
                    flex-shrink: 0;
                    background: none;
                    border: none;
                    color: #6B7280;
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: background 0.15s, color 0.15s;
                }
                .notification-close:hover {
                    background: rgba(0,0,0,0.06);
                    color: #1f2937;
                }

                @keyframes toastSlideDown {
                    from { transform: translate(-50%, -110%); opacity: 0; }
                    to   { transform: translate(-50%, 0);     opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default NotificationToast;
