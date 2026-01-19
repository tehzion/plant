import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { MapPin, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';

const ScanHistoryCard = ({ scan, onDelete }) => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const getSeverityBadgeClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'mild':
        return 'badge-mild';
      case 'moderate':
        return 'badge-moderate';
      case 'severe':
        return 'badge-severe';
      default:
        return '';
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(t('common.dateLocale') || 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleClick = () => {
    navigate(`/results/${scan.id}`);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(t('history.confirmDeleteSingle') || 'Delete this scan?')) {
      onDelete(scan.id);
    }
  };

  return (
    <div className="scan-history-card card" onClick={handleClick}>
      <div className="card-content">
        <img
          src={scan.image}
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
              <span className="meta-separator">•</span>
              <span className="meta-date">{formatDate(scan.timestamp)}</span>
            </p>

            <div className="scan-badge-row">
              <span className={`status-badge-mini ${scan.healthStatus?.toLowerCase() === 'healthy' || scan.healthStatus === 'Sihat' ? 'status-healthy' : 'status-unhealthy'}`}>
                {scan.healthStatus?.toLowerCase() === 'healthy' || scan.healthStatus === 'Sihat' ?
                  <CheckCircle size={10} strokeWidth={3} /> :
                  <AlertTriangle size={10} strokeWidth={3} />
                }
                {t(`results.${(scan.healthStatus || 'unknown').toLowerCase().replace(/\s+/g, '')}`)}
              </span>

              {scan.severity && (
                <span className={`badge-severity ${getSeverityBadgeClass(scan.severity)}`}>
                  {t(`results.${(scan.severity || 'unknown').toLowerCase().replace(/\s+/g, '')}`) || scan.severity}
                </span>
              )}
            </div>
          </div>
          {scan.locationName && (
            <p className="scan-location">
              <MapPin size={14} className="location-icon" />
              {t(scan.locationName)}
            </p>
          )}
        </div>
        <button
          className="delete-btn"
          onClick={handleDelete}
          aria-label="Delete scan"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <style>{`
        .scan-history-card {
          cursor: pointer;
          padding: 16px;
          margin-bottom: 16px;
          transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
          background: white;
          border-radius: 16px; /* Grab-like rounded corners */
          border: none;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06); /* Soft, premium shadow */
        }

        .scan-history-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }

        .scan-history-card:active {
          transform: scale(0.98);
        }

        .card-content {
          display: flex;
          gap: 16px;
          align-items: center;
        }

        .scan-thumbnail {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 12px;
          flex-shrink: 0;
          background-color: #f5f5f5;
        }

        .scan-info {
          flex: 1;
          min-width: 0;
        }

        .scan-disease {
          font-size: 1.1rem;
          color: var(--color-primary-dark);
          margin: 0 0 6px 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 700;
        }

        .scan-meta-group {
          margin-bottom: 8px;
        }

        .scan-meta-text {
          font-size: 0.8rem;
          color: #6B7280;
          margin: 0 0 6px 0;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .meta-separator {
          color: #D1D5DB;
        }

        .meta-date {
          font-weight: 400;
          color: #9CA3AF;
        }

        .scan-badge-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }


        .scan-location {
          font-size: 0.85rem;
          color: #6B7280;
          margin: 4px 0 0 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .scan-location :global(.location-icon) {
            color: #9CA3AF;
            flex-shrink: 0;
        }

        .delete-btn {
          background: #F3F4F6;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9CA3AF;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .delete-btn:hover {
          background: #ffebee;
          color: #EF4444;
          transform: scale(1.1);
        }

        @media (max-width: 480px) {
          .scan-thumbnail {
            width: 70px;
            height: 70px;
          }
          
          .scan-disease {
             font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ScanHistoryCard;
