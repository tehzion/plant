import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import './CustomModal.css';

const CustomModal = ({ isOpen, onClose, onConfirm, title, message, type = 'alert', confirmText, cancelText }) => {
  const { t } = useLanguage();
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  const messageId = useId();
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector('button')?.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const buttons = [...(dialogRef.current?.querySelectorAll('button:not(:disabled)') || [])];
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const retainFocus = (event) => {
      if (!dialogRef.current?.contains(event.target)) dialogRef.current?.querySelector('button')?.focus();
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('focusin', retainFocus);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('focusin', retainFocus);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen]);
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
      <div className="custom-modal-container" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId}>
        <div className="custom-modal-card app-surface">
          <button className="custom-modal-close" onClick={handleCancel} aria-label={t('common.close')}>
            <X size={24} />
          </button>

          <div className="custom-modal-content">
            <h3 className="custom-modal-title" id={titleId}>{title}</h3>
            <p className="custom-modal-message" id={messageId}>{message}</p>
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
