import { CheckCircle, XCircle, Info } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose }) => {
  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    info: <Info size={20} />
  };

  const colors = {
    success: {
      bg: '#10B981',
      border: '#059669'
    },
    error: {
      bg: '#EF4444',
      border: '#DC2626'
    },
    info: {
      bg: '#3B82F6',
      border: '#2563EB'
    }
  };

  return (
    <div className="toast-container">
      <div className="toast-content">
        <span className="toast-icon">{icons[type]}</span>
        <span className="toast-message">{message}</span>
      </div>

      <style>{`
        .toast-container {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10000;
          animation: slideDown 0.3s ease;
        }

        .toast-content {
          display: flex;
          align-items: center;
          gap: 12px;
          background: ${colors[type].bg};
          color: white;
          padding: 14px 24px;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          font-weight: 500;
          font-size: 0.95rem;
          min-width: 280px;
          border: 2px solid ${colors[type].border};
        }

        .toast-icon {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .toast-message {
          flex: 1;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

// Helper function to show toast
export const showToast = (message, type = 'success', duration = 2500) => {
  const container = document.createElement('div');
  container.id = 'toast-root';
  document.body.appendChild(container);

  // Import React and ReactDOM dynamically for rendering
  import('react').then((React) => {
    import('react-dom/client').then((ReactDOM) => {
      const root = ReactDOM.createRoot(container);
      root.render(React.createElement(Toast, { message, type }));

      setTimeout(() => {
        container.style.animation = 'fadeOut 0.3s ease';
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
