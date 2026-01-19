import { X } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';

const CustomModal = ({ isOpen, onClose, onConfirm, title, message, type = 'alert', confirmText, cancelText }) => {
  const { t } = useLanguage();
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <>
      <div className="modal-overlay" onClick={handleCancel} />
      <div className="modal-container">
        <div className="modal-card">
          <button className="modal-close" onClick={handleCancel}>
            <X size={24} />
          </button>

          <div className="modal-content">
            <h3 className="modal-title">{title}</h3>
            <p className="modal-message">{message}</p>
          </div>

          <div className="modal-actions">
            {type === 'confirm' ? (
              <>
                <button className="modal-btn modal-btn-primary" onClick={handleCancel}>
                  {cancelText || t('common.continue')}
                </button>
                <button className="modal-btn modal-btn-danger" onClick={handleConfirm}>
                  {confirmText || t('common.exit')}
                </button>
              </>
            ) : (
              <button className="modal-btn modal-btn-primary" onClick={handleConfirm}>
                {t('common.ok')}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 9998;
          animation: fadeIn 0.2s ease;
        }

        .modal-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 9999;
          width: 90%;
          max-width: 400px;
          animation: slideUp 0.3s ease;
        }

        .modal-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          position: relative;
        }

        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: #F3F4F6;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          color: #6B7280;
        }

        .modal-close:hover {
          background: #E5E7EB;
          transform: scale(1.1);
        }

        .modal-content {
          margin-top: 8px;
          margin-bottom: 24px;
        }

        .modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1F2937;
          margin: 0 0 12px 0;
        }

        .modal-message {
          font-size: 0.95rem;
          color: #6B7280;
          line-height: 1.6;
          margin: 0;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
        }

        .modal-btn {
          flex: 1;
          padding: 14px 24px;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 48px;
        }

        .modal-btn-primary {
          background: var(--color-primary);
          color: white;
          box-shadow: 0 4px 12px rgba(74, 124, 44, 0.3);
        }

        .modal-btn-primary:hover {
          background: var(--color-primary-dark);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(74, 124, 44, 0.4);
        }

        .modal-btn-primary:active {
          transform: translateY(0);
        }

        .modal-btn-secondary {
          background: #F3F4F6;
          color: #374151;
        }

        .modal-btn-secondary:hover {
          background: #E5E7EB;
        }

        .modal-btn-danger {
          background: #EF4444;
          color: white;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .modal-btn-danger:hover {
          background: #DC2626;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
        }

        .modal-btn-danger:active {
          transform: translateY(0);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -40%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </>
  );
};

export default CustomModal;
