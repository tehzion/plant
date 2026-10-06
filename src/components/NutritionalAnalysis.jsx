import { useLanguage } from '../i18n/i18n.jsx';
import { CheckCircle, AlertTriangle, Droplet, Pill } from 'lucide-react';
import { resolveScanNutrition } from '../utils/nutritionUtils.js';
import { SCAN_RESULT_STATES, getScanResultState } from '../utils/statusUtils.js';
import './NutritionalAnalysis.css';

const NutritionalAnalysis = ({ nutritionalIssues, fertilizerRecommendations = [], scanResult }) => {
  const { t } = useLanguage();

  const toTitleCase = (str) => {
    if (!str || typeof str !== 'string') return str;
    return str
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const normalizedIssues = resolveScanNutrition(nutritionalIssues, scanResult);
  const isHealthy = normalizedIssues.status === 'none';
  const isUnconfirmed = Boolean(normalizedIssues.unconfirmedDueToEvidence);
  const isPossible = normalizedIssues.status === 'possible' && !isUnconfirmed;
  const isConfirmed = normalizedIssues.status === 'confirmed';
  const validRecommendations = Array.isArray(fertilizerRecommendations)
    ? fertilizerRecommendations.filter((recommendation) => (
      recommendation && typeof recommendation === 'object'
      && String(recommendation.fertilizerName || recommendation.product || recommendation.name || '').trim()
    ))
    : [];
  const showRecommendations = validRecommendations.length > 0 && !isUnconfirmed;

  const getSeverityColor = (severity) => {
    if (!severity) return 'moderate';
    const sev = severity.toLowerCase();
    if (sev === 'mild') return 'mild';
    if (sev === 'severe') return 'severe';
    return 'moderate';
  };

  return (
    <div className="nutritional-analysis">
      <div className="na-header">
        <h3 className="na-title">{t('results.nutritionalIssues')}</h3>
      </div>

      {isHealthy ? (
        <div className="na-healthy-card app-surface app-surface--soft">
          <div className="na-healthy-icon">
            <CheckCircle size={24} />
          </div>
          <div className="na-healthy-content">
            <h4 className="na-healthy-title">{t('results.noDeficiency')}</h4>
            <p className="na-healthy-subtitle">{t('results.noDeficiencyMessage')}</p>
          </div>
        </div>
      ) : (
        <>
          <div className={`na-alert app-surface ${isPossible ? 'possible-alert' : ''} severity-${getSeverityColor(normalizedIssues?.severity)}`}>
            <div className="na-alert-icon-wrapper">
              <AlertTriangle size={22} />
            </div>
            <div className="na-alert-content">
              <div className="na-alert-header">
                <strong className="na-alert-title">
                  {isConfirmed
                    ? t('results.nutrientDeficiencyDetected')
                    : (isUnconfirmed ? t('results.nutritionNotConfirmed') : t('results.possibleNutrientIssue'))}
                </strong>
                {isPossible ? (
                  <span className="severity-badge possible">{t('results.possibleBadge')}</span>
                ) : normalizedIssues?.severity ? (
                  <span className={`severity-badge ${getSeverityColor(normalizedIssues.severity)}`}>
                    {t(`results.sev${toTitleCase(normalizedIssues.severity).replace(/\s+/g, '')}`)}
                  </span>
                ) : null}
              </div>

              {normalizedIssues?.reasoning && (
                <p className="na-alert-description">{normalizedIssues.reasoning}</p>
              )}

              {!normalizedIssues?.reasoning && isPossible && (
                <p className="na-alert-description">{t('results.nutritionMayAlsoBeContributing')}</p>
              )}

              {!normalizedIssues?.reasoning && isUnconfirmed && (
                <p className="na-alert-description">{t('results.nutritionNotConfirmedMessage')}</p>
              )}

              {(isPossible || isUnconfirmed) && (
                <p className="na-nutrition-caution">
                  {t('results.nutritionRecommendationsCaution') || 'Confirm the nutrient cause with field signs or soil/leaf testing before applying products.'}
                </p>
              )}

              {Array.isArray(normalizedIssues?.symptoms) && normalizedIssues.symptoms.length > 0 && (
                <ul className="na-symptoms-list">
                  {normalizedIssues.symptoms.map((symptom, idx) => (
                    <li key={idx}>{symptom}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {isConfirmed && normalizedIssues?.deficientNutrients && normalizedIssues.deficientNutrients.length > 0 && (
            <div className="na-nutrients-section app-surface app-surface--soft">
              <div className="na-subsection-header">
                <Droplet size={18} className="na-subsection-icon" />
                <h4 className="na-subsection-title">{t('results.lackingNutrients')}</h4>
              </div>
              <div className="na-nutrients-grid">
                {normalizedIssues.deficientNutrients.map((item, index) => {
                  const nutrientName = typeof item === 'string' ? item : item?.nutrient || t('common.unknown');
                  const severity = typeof item === 'object' && item?.severity ? item.severity : null;

                  return (
                    <div key={index} className="na-nutrient-chip">
                      <span className="na-nutrient-name">{toTitleCase(nutrientName)}</span>
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

          {normalizedIssues.status === 'possible' && normalizedIssues.possibleNutrients.length > 0 && (
            <div className="na-nutrients-section na-possible-nutrients-section app-surface app-surface--soft">
              <div className="na-subsection-header">
                <Droplet size={18} className="na-subsection-icon" />
                <h4 className="na-subsection-title">{t('results.suspectedNutrients')}</h4>
              </div>
              <div className="na-nutrients-grid">
                {normalizedIssues.possibleNutrients.map((item, index) => (
                  <div key={`${item}-${index}`} className="na-nutrient-chip na-possible-chip">
                    <span className="na-nutrient-name">{toTitleCase(item)}</span>
                  </div>
                ))}
              </div>
              <p className="na-possible-nutrients-note">{t('results.possibleNutrientOverlap')}</p>
            </div>
          )}
        </>
      )}

      {showRecommendations && (
        <div className="na-recommendations-section app-surface app-surface--soft">
          <div className="na-subsection-header">
            <Pill size={18} className="na-subsection-icon" />
            <h4 className="na-subsection-title">{t('results.fertilizerRecommendations')}</h4>
          </div>
          <p className="na-recommendations-note">
            {isPossible
              ? (t('results.nutritionRecommendationsCaution') || 'Confirm the nutrient cause with field signs or soil/leaf testing before applying products.')
              : (t('results.fertilizerDesc') || 'Use the crop label and farm nutrient plan when applying fertilizer or supplements.')}
          </p>
          <div className="na-recommendations-list">
            {validRecommendations.map((recommendation, index) => {
              const name = String(recommendation.fertilizerName || recommendation.product || recommendation.name).trim();
              return (
                <div className="na-recommendation-card" key={`${name}-${index}`}>
                  <div className="na-recommendation-heading">
                    <strong>{name}</strong>
                    {recommendation.type && <span>{recommendation.type}</span>}
                  </div>
                  <dl className="na-recommendation-details">
                    <div><dt>{t('results.application')}</dt><dd>{recommendation.applicationMethod || recommendation.application || t('results.asDirected')}</dd></div>
                    <div><dt>{t('results.frequency')}</dt><dd>{recommendation.frequency || t('results.asNeeded')}</dd></div>
                    <div><dt>{t('results.amount')}</dt><dd>{recommendation.amount || recommendation.dosage || t('results.followInstructions')}</dd></div>
                  </dl>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionalAnalysis;
