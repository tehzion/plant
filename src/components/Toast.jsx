import { CheckCircle, XCircle, Info } from 'lucide-react';
import './Toast.css';

const Toast = ({ message, type = 'success', onClose }) => {
  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    info: <Info size={20} />,
  };

  const colors = {
    success: {
      bg: '#10B981',
      border: '#059669',
    },
    error: {
      bg: '#EF4444',
      border: '#DC2626',
    },
    info: {
      bg: '#3B82F6',
      border: '#2563EB',
    },
  };

  return (
    <div className="toast-container">
      <div
        className={`toast-content toast-content--${type}`}
        style={{ '--toast-bg': colors[type].bg, '--toast-border': colors[type].border }}
        onClick={onClose}
      >
        <span className="toast-icon">{icons[type]}</span>
        <span className="toast-message">{message}</span>
      </div>
    </div>
  );
};

export const showToast = (message, type = 'success', duration = 2500) => {
  const container = document.createElement('div');
  container.id = 'toast-root';
  document.body.appendChild(container);

  import('react').then((React) => {
    import('react-dom/client').then((ReactDOM) => {
      const root = ReactDOM.createRoot(container);
      root.render(React.createElement(Toast, { message, type }));

      setTimeout(() => {
        container.style.animation = 'toastFadeOut 0.3s ease';
        setTimeout(() => {
          root.unmount();
          if (document.body.contains(container)) {
            document.body.removeChild(container);
          }
        }, 300);
      }, duration);
    });
  });
};

export default Toast;
