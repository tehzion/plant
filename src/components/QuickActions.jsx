import { useState } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import { RotateCcw, Download, Share2, Save, Loader2 } from 'lucide-react';
import './QuickActions.css';

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
    <div className="quick-actions app-surface app-surface--soft">
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
    </div>
  );
};

export default QuickActions;
