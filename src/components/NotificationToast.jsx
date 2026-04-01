import React from 'react';
import { X, CheckCircle, Info, AlertTriangle, ArrowRight } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';
import './NotificationToast.css';

const THEME = {
  success: {
    bg: '#F0FDF4',
    border: '#22C55E',
    icon: <CheckCircle size={22} color="#16A34A" />,
  },
  error: {
    bg: '#FEF2F2',
    border: '#EF4444',
    icon: <AlertTriangle size={22} color="#EF4444" />,
  },
  warning: {
    bg: '#FFFBEB',
    border: '#F59E0B',
    icon: <AlertTriangle size={22} color="#D97706" />,
  },
  info: {
    bg: '#EFF6FF',
    border: '#3B82F6',
    icon: <Info size={22} color="#2563EB" />,
  },
};

const NotificationToast = ({ notification, onClose, onAction }) => {
  const { t } = useLanguage();
  if (!notification) return null;

  const { type = 'info', message, actionLabel } = notification;
  const theme = THEME[type] ?? THEME.info;

  return (
    <div
      className={`notification-toast type-${type}`}
      role="alert"
      aria-live="assertive"
      style={{ '--notification-border': theme.border, '--notification-bg': theme.bg }}
    >
      <div className="notification-content">
        <div className="notification-icon" aria-hidden="true">
          {theme.icon}
        </div>

        <p className="notification-message">{message}</p>

        {actionLabel && (
          <button className="notification-action" onClick={onAction}>
            {actionLabel} <ArrowRight size={14} />
          </button>
        )}

        <button
          className="notification-close"
          onClick={onClose}
          aria-label={t('common.dismissNotification')}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
