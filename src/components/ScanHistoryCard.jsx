import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { MapPin, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';
import { getStandardizedStatus } from '../utils/statusUtils';
import './ScanHistoryCard.css';

const ScanHistoryCard = ({ scan, onDelete }) => {
  const navigate = useNavigate();
  const { t, label } = useLanguage();
  const safeLabel = typeof label === 'function'
    ? label
    : (key, fallback) => {
      const value = t(key);
      return value && value !== key ? value : fallback;
    };

  const standardizedStatus = getStandardizedStatus(scan);
  const healthy = standardizedStatus === 'healthy';

  const getSeverityBadgeClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'mild':
      case 'rendah':
        return 'badge-mild';
      case 'moderate':
      case 'sederhana':
        return 'badge-moderate';
      case 'severe':
      case 'tinggi':
        return 'badge-severe';
      default:
        return '';
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(safeLabel('common.dateLocale', 'en-US'), {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const locationLabel = scan.locationName
    ? scan.locationName.startsWith('common.')
      ? safeLabel(scan.locationName, scan.locationName.replace(/^common\./, ''))
      : safeLabel(`common.${scan.locationName}`, scan.locationName)
    : '';

  const handleClick = () => {
    navigate(`/results/${scan.id}`);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(scan.id);
  };

  return (
    <div className="scan-history-card card app-surface app-surface--soft" onClick={handleClick}>
      <div className="card-content">
        <img
          src={scan.image || scan.image_url || scan.leafImage || scan.leaf_image_url}
          alt={scan.disease}
          className="scan-thumbnail"
        />
        <div className="scan-info">
          <h4 className="scan-disease">{scan.disease}</h4>
          <div className="scan-meta-group">
            <p className="scan-meta-text">
              {(() => {
                const pType = scan.plantType || '';
                const translated = t(`home.category${pType.charAt(0).toUpperCase() + pType.slice(1).toLowerCase()}`);
                return (translated.includes('home.category') ? pType : translated).toUpperCase();
              })()}
              <span className="meta-separator">/</span>
              <span className="meta-date">{formatDate(scan.timestamp)}</span>
            </p>

            <div className="scan-badge-row">
              <span className={`status-badge-mini ${healthy ? 'status-healthy' : 'status-unhealthy'}`}>
                {healthy ?
                  <CheckCircle size={10} strokeWidth={3} /> :
                  <AlertTriangle size={10} strokeWidth={3} />
                }
                {t(`results.${standardizedStatus}`)}
              </span>

              {scan.severity && (
                <span className={`badge-severity ${getSeverityBadgeClass(scan.severity)}`}>
                  {t(`results.${(scan.severity || 'unknown').toLowerCase().replace(/\s+/g, '')}`) || scan.severity}
                </span>
              )}
            </div>
          </div>
          {locationLabel && (
            <p className="scan-location">
              <MapPin size={14} className="location-icon" />
              {locationLabel}
            </p>
          )}
        </div>
        <button
          className="delete-btn"
          onClick={handleDelete}
          aria-label={t('history.deleteScan') === 'history.deleteScan' ? t('common.delete') : t('history.deleteScan')}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default ScanHistoryCard;

