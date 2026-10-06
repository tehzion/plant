import StatusBadge from './StatusBadge.jsx';
import { assessScanDecision } from '../../shared/scanResultPolicy.js';
import { getDiagnosisStatusLabel } from '../utils/diagnosisStatusLabels.js';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { MapPin, Trash2, Leaf } from 'lucide-react';
import { getStandardizedStatus } from '../utils/statusUtils';
import './ScanHistoryCard.css';
import { getUiCopy, isFollowUpDue } from '../utils/uiCopy.js';

const ScanHistoryCard = ({ scan, onDelete }) => {
  const { t, label, language } = useLanguage();
  const safeLabel = typeof label === 'function'
    ? label
    : (key, fallback) => {
      const value = t(key);
      return value && value !== key ? value : fallback;
    };

  const standardizedStatus = getStandardizedStatus(scan);
  const decision = assessScanDecision(scan);
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
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
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
  const previewSrc = scan.image || scan.image_url || scan.leafImage || scan.leaf_image_url;

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(scan.id);
  };

  return (
    <article className="scan-history-card">
      <div className="card-content">
        <div className="scan-thumbnail-shell">
          {previewSrc ? (
            <img
              src={previewSrc}
              alt={scan.disease}
              className="scan-thumbnail"
            />
          ) : (
            <div className="scan-thumbnail scan-thumbnail-fallback" aria-hidden="true">
              <Leaf size={28} />
            </div>
          )}
        </div>
        <div className="scan-info">
          <h4 className="scan-disease"><Link className="scan-card-link" to={`/results/${scan.id}`}>{scan.disease}</Link></h4>
          <div className="scan-meta-group">
            <p className="scan-meta-text">
              {(() => {
                const pType = scan.plantType || '';
                const translated = t(`home.category${pType.charAt(0).toUpperCase() + pType.slice(1).toLowerCase()}`);
                return (translated.includes('home.category') ? pType : translated).toUpperCase();
              })()}
              <span className="meta-separator">/</span>
              <span className="meta-date">{formatDate(scan.timestamp ?? scan.created_at)}</span>
            </p>

            <div className="scan-badge-row">
              {isFollowUpDue(scan) && <span className="status-badge-mini status-review">{getUiCopy(language).due}</span> }
              <StatusBadge tone={decision.needsReview ? 'review' : healthy ? 'healthy' : 'unhealthy'}>
                {decision.needsReview ? getDiagnosisStatusLabel(t, decision.resultState) : t(`results.${standardizedStatus}`)}
              </StatusBadge>

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
    </article>
  );
};

export default ScanHistoryCard;

