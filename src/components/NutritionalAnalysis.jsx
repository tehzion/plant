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
                    {t(`results.sev${toTitleCase(nutritionalIssues.severity).replace(/\s+/g, '')}`)}
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
                  const nutrientName = typeof item === 'string' ? item : (item?.nutrient || t('common.unknown'));
                  const severity = typeof item === 'object' && item?.severity ? item.severity : null;

                  return (
                    <div key={index} className="nutrient-chip">
                      <span className="nutrient-name">{toTitleCase(nutrientName)}</span>
                      {severity && (
                        <span className={`chip-severity ${getSeverityColor(severity)}`}>
                          {t(`results.sev${toTitleCase(severity).replace(/\s+/g, '')}`)}
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
                {t('results.fertilizerDesc')}
              </p>
              <div className="fertilizers-list">
                {validRecommendations.map((rec, index) => (
                  <div key={index} className="fertilizer-card">
                    <div className="fertilizer-header">
                      <div className="fertilizer-icon-circle">
                        <Pill size={18} />
                      </div>
                      <span className="fertilizer-name">
                        {(() => {
                          const rawName = rec.fertilizerName || rec.product || rec.name || '';
                          const normalizedName = rawName.toLowerCase().trim();

                          // List of generic names to filter out (expanded)
                          const genericNames = [
                            'chemical', 'kimia', 'baja kimia',
                            'organic', 'organik', 'baja organik',
                            'fertilizer', 'baja',
                            'compound', 'kompaun'
                          ];

                          // Check if the name is too generic
                          const isGeneric = genericNames.includes(normalizedName) ||
                            normalizedName.length < 3 ||
                            normalizedName === 'n/a' ||
                            normalizedName === '-';

                          if (!isGeneric && rawName) {
                            return toTitleCase(rawName);
                          }

                          // Fallback: use type-based translation with more specific naming
                          const recType = rec.type?.toLowerCase();
                          if (recType === 'organic' || recType === 'organik') {
                            return t('results.organicFertilizer');
                          } else if (recType === 'chemical' || recType === 'kimia') {
                            return t('results.chemicalFertilizer');
                          }

                          // Ultimate fallback
                          return t('results.generalFertilizer');
                        })()}
                      </span>
                    </div>
                    <div className="fertilizer-details">
                      <div className="detail-row">
                        <span className="detail-label">{t('results.application')}:</span>
                        <span className="detail-value">{rec.application || rec.applicationMethod || t('results.asDirected')}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">{t('results.frequency')}:</span>
                        <span className="detail-value">{rec.frequency || t('results.asNeeded')}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">{t('results.amount')}:</span>
                        <span className="detail-value">{rec.amount || rec.dosage || t('results.followInstructions')}</span>
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
          width: 100%;
        }

        /* Container matching other sections */
        .nutritional-analysis > * {
          background: #FAFAFA;
          padding: 20px;
          border-radius: 16px;
          margin-bottom: 24px;
        }

        .section-header-centered {
          display: flex;
          align-items: center;
          justify-content: flex-start; /* Standardize to left */
          margin-bottom: 16px;
          background: transparent !important;
          padding: 0 !important;
        }

        .section-title {
          font-size: 1.25rem;
          color: #1F2937;
          margin: 0;
          text-align: left; /* Standardize to left */
          font-weight: 700;
        }

        /* Healthy Card - Consistent with other sections */
        .healthy-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          border-radius: 12px;
          background: white !important;
          border: 1px solid #E5E7EB;
          max-width: 500px;
          margin: 0 auto;
        }

        .healthy-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #D1FAE5;
          color: #10B981;
          flex-shrink: 0;
        }

        .healthy-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .healthy-title {
          font-size: 1rem;
          font-weight: 600;
          color: #065F46;
          margin: 0;
        }

        .healthy-subtitle {
          font-size: 0.875rem;
          color: #6B7280;
          margin: 0;
          line-height: 1.5;
        }

        /* Deficiency Alert */
        .deficiency-alert {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px;
          border-radius: 12px;
          border: 2px solid;
          margin-bottom: 16px;
        }

        .deficiency-alert.severity-mild {
          background: #FEF3C7;
          border-color: #FCD34D;
        }

        .deficiency-alert.severity-moderate {
          background: #FFEDD5;
          border-color: #FB923C;
        }

        .deficiency-alert.severity-severe {
          background: #FEE2E2;
          border-color: #F87171;
        }

        .alert-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          flex-shrink: 0;
        }

        .severity-mild .alert-icon-wrapper {
          color: #D97706;
        }

        .severity-moderate .alert-icon-wrapper {
          color: #EA580C;
        }

        .severity-severe .alert-icon-wrapper {
          color: #DC2626;
        }

        .alert-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .alert-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .alert-title {
          font-size: 1rem;
          font-weight: 700;
          color: #1F2937;
        }

        .severity-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .severity-badge.mild {
          background: #FCD34D;
          color: #92400E;
        }

        .severity-badge.moderate {
          background: #FB923C;
          color: #9A3412;
        }

        .severity-badge.severe {
          background: #F87171;
          color: #991B1B;
        }

        .alert-description {
          font-size: 0.9rem;
          color: #4B5563;
          line-height: 1.6;
          margin: 0;
        }

        .symptoms-list {
          margin: 8px 0 0 0;
          padding-left: 20px;
          color: #4B5563;
          font-size: 0.875rem;
          line-height: 1.6;
        }

        .symptoms-list li {
          margin-bottom: 4px;
        }

        /* Nutrients Section */
        .nutrients-section {
          background: white;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
          margin-bottom: 16px;
        }

        .subsection-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
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

        .nutrients-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .nutrient-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: #F3F4F6;
          border: 1px solid #E5E7EB;
          border-radius: 20px;
          font-size: 0.875rem;
        }

        .nutrient-name {
          font-weight: 600;
          color: #1F2937;
        }

        .chip-severity {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
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

        /* Fertilizer Section */
        .fertilizer-section {
          background: white;
          padding: 20px;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
        }

        .subsection-description {
          font-size: 0.875rem;
          color: #6B7280;
          margin: 0 0 16px 0;
          line-height: 1.5;
        }

        .fertilizers-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .fertilizer-card {
          background: #F9FAFB;
          padding: 16px;
          border-radius: 10px;
          border: 1px solid #E5E7EB;
        }

        .fertilizer-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .fertilizer-icon-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #DBEAFE;
          color: #3B82F6;
          flex-shrink: 0;
        }

        .fertilizer-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: #1F2937;
          flex: 1;
        }

        .fertilizer-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .detail-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          font-size: 0.875rem;
        }

        .detail-label {
          font-weight: 600;
          color: #6B7280;
          min-width: 90px;
        }

        .detail-value {
          color: #374151;
          flex: 1;
        }

        @media (max-width: 768px) {
          .nutritional-analysis > * {
            padding: 16px;
          }

          .section-title {
            font-size: 1.125rem;
          }

          .healthy-card {
            max-width: 100%;
          }

          .deficiency-alert {
            padding: 16px;
          }

          .nutrients-section,
          .fertilizer-section {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default NutritionalAnalysis;
