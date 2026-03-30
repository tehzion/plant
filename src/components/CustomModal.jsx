import { X } from 'lucide-react';
import { useLanguage } from '../i18n/i18n.jsx';
import './CustomModal.css';

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
      <div className="custom-modal-overlay" onClick={handleCancel} />
      <div className="custom-modal-container">
        <div className="custom-modal-card app-surface">
          <button className="custom-modal-close" onClick={handleCancel}>
            <X size={24} />
          </button>

          <div className="custom-modal-content">
            <h3 className="custom-modal-title">{title}</h3>
            <p className="custom-modal-message">{message}</p>
          </div>

          <div className="custom-modal-actions">
            {type === 'confirm' ? (
              <>
                <button className="custom-modal-btn custom-modal-btn-primary" onClick={handleCancel}>
                  {cancelText || t('common.continue')}
                </button>
                <button className="custom-modal-btn custom-modal-btn-danger" onClick={handleConfirm}>
                  {confirmText || t('common.exit')}
                </button>
              </>
            ) : (
              <button className="custom-modal-btn custom-modal-btn-primary" onClick={handleConfirm}>
                {t('common.ok')}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomModal;
