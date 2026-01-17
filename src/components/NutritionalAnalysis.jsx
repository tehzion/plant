import { useLanguage } from '../i18n/i18n.jsx';
import { CheckCircle, AlertTriangle, Droplet, Pill } from 'lucide-react';

const NutritionalAnalysis = ({ nutritionalIssues, fertilizerRecommendations }) => {
  const { t } = useLanguage();

  const toTitleCase = (str) => {
    if (!str || typeof str !== 'string') return str;
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const isHealthy = !nutritionalIssues || !nutritionalIssues.hasDeficiency;
  const validRecommendations = Array.isArray(fertilizerRecommendations) ? fertilizerRecommendations : [];

  const getSeverityColor = (severity) => {
    if (!severity) return 'moderate';
    const sev = severity.toLowerCase();
    if (sev === 'mild') return 'mild';
    if (sev === 'severe') return 'severe';
    return 'moderate';
  };

  return (
    <div className="nutritional-analysis">
      {/* Section Header */}
      <div className="section-header-centered">
        <h3 className="section-title">{t('results.nutritionalIssues')}</h3>
      </div>

      {isHealthy ? (
        <div className="healthy-card">
          <div className="healthy-icon">
            <CheckCircle size={24} />
          </div>
          <div className="healthy-content">
            <h4 className="healthy-title">{t('results.noDeficiency')}</h4>
            <p className="healthy-subtitle">{t('results.noDeficiencyMessage')}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Deficiency Alert */}
          <div className={`deficiency-alert severity-${getSeverityColor(nutritionalIssues?.severity)}`}>
            <div className="alert-icon-wrapper">
              <AlertTriangle size={22} />
            </div>
            <div className="alert-content">
              <div className="alert-header">
                <strong className="alert-title">{t('results.nutrientDeficiencyDetected')}</strong>
                {nutritionalIssues?.severity && (
                  <span className={`severity-badge ${getSeverityColor(nutritionalIssues.severity)}`}>
                    {nutritionalIssues.severity}
                  </span>
                )}
              </div>
              {typeof nutritionalIssues?.symptoms === 'string' && (
                <p className="alert-description">{nutritionalIssues.symptoms}</p>
              )}
              {Array.isArray(nutritionalIssues?.symptoms) && nutritionalIssues.symptoms.length > 0 && (
                <ul className="symptoms-list">
                  {nutritionalIssues.symptoms.map((symptom, idx) => (
                    <li key={idx}>{symptom}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Deficient Nutrients */}
          {nutritionalIssues?.deficientNutrients && Array.isArray(nutritionalIssues.deficientNutrients) && nutritionalIssues.deficientNutrients.length > 0 && (
            <div className="nutrients-section">
              <div className="subsection-header">
                <Droplet size={18} className="subsection-icon" />
                <h4 className="subsection-title">{t('results.lackingNutrients')}</h4>
              </div>
              <div className="nutrients-grid">
                {nutritionalIssues.deficientNutrients.map((item, index) => {
                  const nutrientName = typeof item === 'string' ? item : (item?.nutrient || 'Unknown');
                  const severity = typeof item === 'object' && item?.severity ? item.severity : null;

                  return (
                    <div key={index} className="nutrient-chip">
                      <span className="nutrient-name">{toTitleCase(nutrientName)}</span>
                      {severity && (
                        <span className={`chip-severity ${getSeverityColor(severity)}`}>
                          {severity}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fertilizer Recommendations */}
          {validRecommendations.length > 0 && (
            <div className="fertilizer-section">
              <div className="subsection-header">
                <Pill size={18} className="subsection-icon" />
                <h4 className="subsection-title">{t('results.fertilizerRecommendations')}</h4>
              </div>
              <p className="subsection-description">
                Baja dan suplemen yang dirumus khas untuk memulihkan kesihatan tanaman anda
              </p>
              <div className="fertilizers-list">
                {validRecommendations.map((rec, index) => (
                  <div key={index} className="fertilizer-card">
                    <div className="fertilizer-header">
                      <div className="fertilizer-icon-circle">
                        <Pill size={18} />
                      </div>
                      <span className="fertilizer-name">
                        {toTitleCase(rec.fertilizerName || rec.product || rec.name || rec.type || (language === 'ms' ? 'Baja Disyorkan' : 'Recommended Fertilizer'))}
                      </span>
                    </div>
                    <div className="fertilizer-details">
                      <div className="detail-row">
                        <span className="detail-label">{t('results.application')}:</span>
                        <span className="detail-value">{rec.application || rec.applicationMethod || 'As directed'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">{t('results.frequency')}:</span>
                        <span className="detail-value">{rec.frequency || 'As needed'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">{t('results.amount')}:</span>
                        <span className="detail-value">{rec.amount || rec.dosage || 'Follow package instructions'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        .nutritional-analysis {
          background: #FAFAFA;
          padding: 20px;
          border-radius: 16px;
          margin-bottom: 24px;
        }

        .section-header-centered {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .section-title {
          font-size: 1.25rem;
          color: #1F2937;
          margin: 0;
          text-align: center;
          font-weight: 700;
        }

        /* Healthy Status Card */
        .healthy-card {
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
        }

        .healthy-icon {
          width: 40px;
          height: 40px;
          background: #D1FAE5;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #10B981;
          flex-shrink: 0;
        }

        .healthy-content {
          flex: 1;
        }

        .healthy-title {
          font-size: 1rem;
          font-weight: 600;
          color: #065F46;
          margin: 0 0 4px 0;
        }

        .healthy-subtitle {
          font-size: 0.85rem;
          color: #047857;
          margin: 0;
        }

        /* Deficiency Alert */
        .deficiency-alert {
          display: flex;
          gap: 12px;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid;
          background: white;
          margin-bottom: 12px;
        }

        .deficiency-alert.severity-mild {
          border-color: #FCD34D;
        }

        .deficiency-alert.severity-moderate {
          border-color: #FB923C;
        }

        .deficiency-alert.severity-severe {
          border-color: #F87171;
        }

        .alert-icon-wrapper {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F3F4F6;
          flex-shrink: 0;
        }

        .severity-mild .alert-icon-wrapper {
          background: #FEF3C7;
          color: #D97706;
        }

        .severity-moderate .alert-icon-wrapper {
          background: #FED7AA;
          color: #EA580C;
        }

        .severity-severe .alert-icon-wrapper {
          background: #FECACA;
          color: #DC2626;
        }

        .alert-content {
          flex: 1;
        }

        .alert-header {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }

        .alert-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: #1F2937;
        }

        .severity-badge {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .severity-badge.mild {
          background: #FEF3C7;
          color: #92400E;
        }

        .severity-badge.moderate {
          background: #FFEDD5;
          color: #9A3412;
        }

        .severity-badge.severe {
          background: #FEE2E2;
          color: #991B1B;
        }

        .alert-description {
          font-size: 0.85rem;
          color: #6B7280;
          margin: 0;
          line-height: 1.5;
        }

        .symptoms-list {
          margin: 6px 0 0 0;
          padding-left: 18px;
          font-size: 0.85rem;
          color: #6B7280;
        }

        .symptoms-list li {
          margin-bottom: 3px;
        }

        /* Subsections */
        .nutrients-section,
        .fertilizer-section {
          background: white;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
          margin-bottom: 12px;
        }

        .subsection-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .subsection-icon {
          color: var(--color-primary);
        }

        .subsection-title {
          font-size: 1rem;
          font-weight: 600;
          color: #1F2937;
          margin: 0;
        }

        .subsection-description {
          font-size: 0.85rem;
          color: #6B7280;
          margin: 0 0 12px 0;
          line-height: 1.4;
        }

        /* Nutrients Grid */
        .nutrients-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .nutrient-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #F9FAFB;
          padding: 6px 12px;
          border-radius: 16px;
          border: 1px solid #E5E7EB;
        }

        .nutrient-name {
          font-size: 0.85rem;
          font-weight: 500;
          color: #1F2937;
        }

        .chip-severity {
          font-size: 0.7rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 8px;
        }

        .chip-severity.mild {
          background: #FEF3C7;
          color: #92400E;
        }

        .chip-severity.moderate {
          background: #FFEDD5;
          color: #9A3412;
        }

        .chip-severity.severe {
          background: #FEE2E2;
          color: #991B1B;
        }

        /* Fertilizers List */
        .fertilizers-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .fertilizer-card {
          background: #F9FAFB;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
        }

        .fertilizer-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }

        .fertilizer-icon-circle {
          width: 32px;
          height: 32px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-primary);
          flex-shrink: 0;
        }

        .fertilizer-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: #1F2937;
        }

        .fertilizer-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-left: 42px;
        }

        .detail-row {
          font-size: 0.85rem;
          color: #6B7280;
          display: flex;
          gap: 6px;
        }

        .detail-label {
          font-weight: 500;
          color: #4B5563;
          flex-shrink: 0;
        }

        .detail-value {
          flex: 1;
        }

        @media (max-width: 768px) {
          .nutritional-analysis {
            padding: 16px;
          }

          .section-title {
            font-size: 1.125rem;
          }

          .deficiency-alert {
            flex-direction: row;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default NutritionalAnalysis;
