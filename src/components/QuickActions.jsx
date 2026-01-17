import { useState } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import { RotateCcw, Download, Share2, Save, Loader2 } from 'lucide-react';

const QuickActions = ({ onScanAgain, onDownload, onShare, onSaveHistory }) => {
  const { t } = useLanguage();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await onDownload();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="quick-actions">
      <div className="actions-container">
        <button onClick={onScanAgain} className="action-btn primary">
          <span className="icon"><RotateCcw size={20} /></span>
          <span className="label">{t('results.scanAgain')}</span>
        </button>

        <button onClick={handleDownload} className="action-btn" disabled={isDownloading}>
          <span className="icon">
            {isDownloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
          </span>
          <span className="label">
            {isDownloading ? t('common.loading') : t('results.download')}
          </span>
        </button>

        <button onClick={onShare} className="action-btn">
          <span className="icon"><Share2 size={20} /></span>
          <span className="label">{t('results.share')}</span>
        </button>

        <button onClick={onSaveHistory} className="action-btn">
          <span className="icon"><Save size={20} /></span>
          <span className="label">{t('results.saveHistory')}</span>
        </button>
      </div>

      <style>{`
        .quick-actions {
          position: relative;
          z-index: 10;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: var(--radius-2xl);
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          margin: var(--space-sm) 0 var(--space-md); /* Reduced margins */
          padding: var(--space-sm);
        }

        .actions-container {
          display: flex;
          gap: var(--space-xs);
          justify-content: space-between;
          align-items: center;
        }

        .action-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 10px 4px;
          border: none;
          background: transparent;
          color: var(--color-text-secondary);
          font-family: var(--font-family);
          font-size: var(--font-size-xs);
          font-weight: 600;
          cursor: pointer;
          border-radius: var(--radius-lg);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Animation for spinner */
        :global(.animate-spin) {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .action-btn:hover:not(:disabled) {
          background: rgba(95, 168, 62, 0.08);
          color: var(--color-primary);
          transform: translateY(-2px);
        }

        .action-btn:active:not(:disabled) {
          transform: scale(0.95);
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Primary Button (Scan Again) */
        .action-btn.primary {
          background: var(--color-primary);
          color: white;
          box-shadow: 0 4px 12px rgba(95, 168, 62, 0.3);
          flex: 1.2; /* Slightly wider */
        }

        .action-btn.primary:hover {
          background: var(--color-primary-dark);
          box-shadow: 0 6px 16px rgba(95, 168, 62, 0.4);
          transform: translateY(-2px);
        }

        .icon {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2px;
        }

        @media (max-width: 480px) {
           .quick-actions {
             margin: 0 -8px var(--space-lg); /* Slight bleed on very small screens */
             border-radius: var(--radius-lg);
           }
        }

        /* Desktop specific */
        @media (min-width: 768px) {
           .actions-container {
             justify-content: center;
             gap: var(--space-xl);
           }

           .action-btn {
             flex-direction: row;
             padding: 12px 24px;
             font-size: var(--font-size-sm);
             flex: 0 1 auto;
             min-width: 140px;
           }

           .quick-actions {
             padding: var(--space-md);
             border-radius: 100px; /* Pill shape on desktop */
             max-width: 800px;
             margin: var(--space-xl) auto var(--space-2xl);
           }
        }
      `}</style>
    </div>
  );
};

export default QuickActions;
