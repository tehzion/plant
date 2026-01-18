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
                  const nutrientName = typeof item === 'string' ? item : (item?.nutrient || 'Unknown');
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

    </div>
  );
};

export default NutritionalAnalysis;
