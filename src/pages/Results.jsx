import { useParams, useNavigate } from 'react-router-dom';
import { getScanById } from '../utils/localStorage';
import { imageToBase64 } from '../utils/diseaseDetection';
import { useLanguage } from '../i18n/i18n.jsx';
import translations from '../i18n/translations';
import { generatePDFReport } from '../utils/pdfGenerator';
import QuickActions from '../components/QuickActions';
import TabbedResults from '../components/TabbedResults';
import DiseaseResult from '../components/DiseaseResult';
import TreatmentRecommendations from '../components/TreatmentRecommendations';
import NutritionalAnalysis from '../components/NutritionalAnalysis';
import ProductRecommendations from '../components/ProductRecommendations';
import HealthyCarePlan from '../components/HealthyCarePlan';
import SpecificProductRecommendations from '../components/SpecificProductRecommendations';
import { Search, Pill, Sprout, ShoppingBag } from 'lucide-react';
import { showToast } from '../utils/toast';

const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const scan = getScanById(id);

  if (!scan) {
    return (
      <div className="results">
        <div className="container">
          <div className="error-message">
            <h2>{t('history.noHistory')}</h2>
            <p>{t('history.noHistoryMessage')}</p>
            <button onClick={() => navigate('/')} className="btn btn-primary">
              {t('common.back')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const result = {
    healthStatus: scan.healthStatus,
    plantType: scan.plantType,
    disease: scan.disease,
    fungusType: scan.fungusType,
    pathogenType: scan.pathogenType,
    estimatedAge: scan.estimatedAge,
    confidence: scan.confidence,
    severity: scan.severity,
    plantPart: scan.plantPart,
    symptoms: scan.symptoms,
    immediateActions: scan.immediateActions,
    treatments: scan.treatments,
    prevention: scan.prevention,
    healthyCarePlan: scan.healthyCarePlan,
    additionalNotes: scan.additionalNotes
  };

  const calculateEstimatedTrees = (category, acres) => {
    // Estimations based on typical planting density per acre
    const densityMap = {
      'Durian': 35,      // ~30-40 trees/acre
      'Coconut': 60,     // ~50-70 trees/acre
      'Banana': 500,     // ~400-600 plants/acre
      'Cocoa': 450,      // ~400-500 trees/acre
      'Pepper': 700,     // ~600-800 vines/acre
      'Pineapple': 12000,// ~10k-14k plants/acre
      'Corn': 20000,     // ~18k-24k plants/acre
      'Rubber': 190,     // ~180-200 trees/acre
      'Palm Oil': 55,    // ~50-60 trees/acre
      'Vegetables': 0    // Too variable
    };

    const density = densityMap[category] || 50;
    if (density === 0) return 'Varied';

    return Math.round(acres * density).toLocaleString();
  };

  const handleScanAgain = () => {
    navigate('/?scan=true');
  };

  const handleDownload = async () => {
    showToast(t('results.generatingPDF'), 'info', 10000);

    try {
      await generatePDFReport(scan, language, translations);
      showToast(t('results.pdfDownloaded'), 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast(t('results.pdfFailed'), 'error');
      handleDownloadText();
    }
  };

  const handleDownloadText = () => {
    // Fallback: Create a simple text report
    const report = `
${t('pdf.title')}
============================================

${t('common.date')}: ${new Date(scan.timestamp).toLocaleString()}
${t('results.plantType')}: ${scan.plantType}
${t('results.category')}: ${scan.category}
${t('results.scale')}: ${scan.farmScale || t('results.notSpecified')}
${scan.estimatedAge ? `${t('results.estimatedAge')}: ${scan.estimatedAge}` : ''}

${t('results.status')}: ${scan.healthStatus}
${t('results.disease')}: ${scan.disease}
${scan.fungusType ? `${t('results.fungusSpecies')}: ${scan.fungusType}` : ''}
${scan.pathogenType ? `${t('results.pathogenType')}: ${scan.pathogenType}` : ''}
${t('results.confidence')}: ${scan.confidence}%
${t('results.severity')}: ${scan.severity}

${t('results.symptoms')}:
${scan.symptoms}

${scan.healthStatus?.toLowerCase() !== 'healthy' ? `
${t('results.immediateActions')}:
${scan.immediateActions?.map((action, i) => `${i + 1}. ${action}`).join('\n')}

${t('results.treatments')}:
${scan.treatments?.map((treatment, i) => `${i + 1}. ${treatment}`).join('\n')}
` : ''}

${scan.healthyCarePlan ? `
${t('results.dailyCare')}:
${scan.healthyCarePlan.dailyCare?.map((care, i) => `${i + 1}. ${care}`).join('\n')}

${t('results.weeklyCare')}:
${scan.healthyCarePlan.weeklyCare?.map((care, i) => `${i + 1}. ${care}`).join('\n')}

${t('results.monthlyCare')}:
${scan.healthyCarePlan.monthlyCare?.map((care, i) => `${i + 1}. ${care}`).join('\n')}

${t('results.bestPractices')}:
${scan.healthyCarePlan.bestPractices?.map((practice, i) => `${i + 1}. ${practice}`).join('\n')}
` : ''}

${t('results.prevention')}:
${scan.prevention?.map((prev, i) => `${i + 1}. ${prev}`).join('\n')}

${scan.nutritionalIssues?.hasDeficiency ? `
${t('results.nutritionalIssues')}:
${t('results.lackingNutrients')}: ${scan.nutritionalIssues.deficientNutrients?.join(', ')}
${t('results.symptoms')}: ${scan.nutritionalIssues.symptoms}
${t('results.severity')}: ${scan.nutritionalIssues.severity}
` : ''}

${t('common.note')}:
${scan.additionalNotes}

---
${t('pdf.generatedBy')}
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plant-analysis-${id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    // Try Native Share API first (Mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('pdf.title') || 'Plant Analysis Report',
          text: `${t('results.disease')}: ${scan.disease} (${scan.healthStatus})`,
          url: window.location.href,
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Share failed:', err);
      }
    }

    // Fallback to Clipboard
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast(t('results.linkCopied'), 'success');
    } catch (err) {
      console.error('Failed to copy link:', err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        showToast(t('results.linkCopied'), 'success');
      } catch (err) {
        console.error('Fallback copy failed', err);
        showToast(t('results.copyFailed'), 'error');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleSaveHistory = () => {
    showToast(t('results.savedSuccess'), 'success');
  };

  // Prepare tabs for TabbedResults
  const tabs = [
    {
      icon: <Search size={20} />,
      title: t('results.diseaseInfo'),
      content: (
        <div>
          <DiseaseResult result={result} image={scan.image} leafImage={scan.leafImage} />
        </div>
      )
    },
    {
      icon: <Pill size={20} />,
      title: scan.healthStatus?.toLowerCase() === 'healthy' ? t('results.care') || 'Care' : t('results.treatment'),
      content: (
        <div>
          {scan.healthStatus?.toLowerCase() !== 'healthy' ? (
            <TreatmentRecommendations result={result} />
          ) : scan.healthyCarePlan ? (
            <HealthyCarePlan carePlan={scan.healthyCarePlan} plantType={scan.plantType} />
          ) : (
            <div className="healthy-message">
              <h3>✅ {t('results.plantIsHealthy')}</h3>
              <p>{t('results.keepUpGoodWork')}</p>
            </div>
          )}
        </div>
      )
    },
    {
      icon: <Sprout size={20} />,
      title: t('results.nutrition'),
      badge: scan.nutritionalIssues?.hasDeficiency ? '!' : null,
      content: (
        <div>
          <NutritionalAnalysis
            nutritionalIssues={scan.nutritionalIssues}
            fertilizerRecommendations={scan.fertilizerRecommendations}
          />
        </div>
      )
    },
    {
      icon: <ShoppingBag size={20} />,
      title: t('results.products'),
      content: (
        <div>
          <ProductRecommendations
            plantType={scan.plantType}
            disease={scan.disease}
            farmScale={scan.farmScale}
          />
        </div>
      )
    }
  ];

  return (
    <div className="results page">
      <div className="container">
        {/* Quick Actions Bar */}
        <QuickActions
          onScanAgain={handleScanAgain}
          onDownload={handleDownload}
          onShare={handleShare}
          onSaveHistory={handleSaveHistory}
        />



        {/* Tabbed Results */}
        <TabbedResults tabs={tabs} />

        {/* Scan Metadata Card - Modern Design */}
        <div className="scan-metadata-card">
          <div className="metadata-grid">
            {/* Category */}
            <div className="metadata-item">
              <div className="metadata-icon category-icon">
                <Sprout size={20} />
              </div>
              <div className="metadata-content">
                <span className="metadata-label">{t('results.category')}</span>
                <span className="metadata-value">{t(`home.category${scan.category.replace(/[^a-zA-Z0-9]/g, '')}`) || scan.category}</span>
              </div>
            </div>

            {/* Farm Scale */}
            <div className="metadata-item">
              <div className="metadata-icon scale-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <div className="metadata-content">
                <span className="metadata-label">{t('home.selectScale')}</span>
                <span className="metadata-value">
                  {(scan.farmScale === 'hectare' || scan.farmScale === 'acre') && t('home.hectareScale')}
                  {scan.farmScale === 'tree' && t('home.treeScale')}
                  {scan.farmScale === 'personal' && t('home.personalScale')}
                  {!scan.farmScale && t('results.notSpecified')}
                </span>
              </div>
            </div>

            {/* Quantity - Only if exists */}
            {(scan.farmScale === 'acre' || scan.farmScale === 'hectare') && scan.scaleQuantity && Number(scan.scaleQuantity) > 0 && (
              <div className="metadata-item highlight">
                <div className="metadata-icon quantity-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                  </svg>
                </div>
                <div className="metadata-content">
                  <span className="metadata-label">{t('common.quantity')}</span>
                  <span className="metadata-value primary">
                    {Number(scan.scaleQuantity)} {language === 'ms' ? 'Ekar' : 'Acres'}
                  </span>
                </div>
              </div>
            )}

            {/* Tree Quantity - For tree scale */}
            {scan.farmScale === 'tree' && scan.scaleQuantity && Number(scan.scaleQuantity) > 0 && (
              <div className="metadata-item highlight">
                <div className="metadata-icon trees-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L12 22"></path>
                    <path d="M5 8C5 8 7 6 12 6C17 6 19 8 19 8"></path>
                    <path d="M5 12C5 12 7 10 12 10C17 10 19 12 19 12"></path>
                    <path d="M5 16C5 16 7 14 12 14C17 14 19 16 19 16"></path>
                  </svg>
                </div>
                <div className="metadata-content">
                  <span className="metadata-label">{t('home.trees')}</span>
                  <span className="metadata-value primary">
                    {Number(scan.scaleQuantity)} {language === 'ms' ? 'Pokok' : 'Trees'}
                  </span>
                </div>
              </div>
            )}

            {/* Estimated Trees - Only for acre/hectare scale */}
            {(scan.farmScale === 'acre' || scan.farmScale === 'hectare') && scan.scaleQuantity && Number(scan.scaleQuantity) > 0 && (
              <div className="metadata-item highlight">
                <div className="metadata-icon trees-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L12 22"></path>
                    <path d="M5 8C5 8 7 6 12 6C17 6 19 8 19 8"></path>
                    <path d="M5 12C5 12 7 10 12 10C17 10 19 12 19 12"></path>
                    <path d="M5 16C5 16 7 14 12 14C17 14 19 16 19 16"></path>
                  </svg>
                </div>
                <div className="metadata-content">
                  <span className="metadata-label">{t('home.estimatedTrees')}</span>
                  <span className="metadata-value primary">
                    ~{calculateEstimatedTrees(scan.category, Number(scan.scaleQuantity))}
                  </span>
                </div>
              </div>
            )}

            {/* Date & Time */}
            <div className="metadata-item">
              <div className="metadata-icon date-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div className="metadata-content">
                <span className="metadata-label">{t('common.date')}</span>
                <span className="metadata-value">
                  {new Date(scan.timestamp).toLocaleDateString()}
                  <span className="metadata-time">
                    {new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </span>
              </div>
            </div>

            {/* Location - Only if exists */}
            {scan.location && (
              <div className="metadata-item location-item">
                <div className="metadata-icon location-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </div>
                <div className="metadata-content">
                  <span className="metadata-label">{t('common.location')}</span>
                  <span className="metadata-value">
                    {scan.locationName || `${scan.location.lat.toFixed(4)}, ${scan.location.lng.toFixed(4)}`}
                    {scan.locationName && (
                      <span className="metadata-coords">
                        {scan.location.lat.toFixed(4)}, {scan.location.lng.toFixed(4)}
                      </span>
                    )}
                  </span>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${scan.location.lat},${scan.location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="map-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .results {
          min-height: 100vh;
          background: var(--color-bg-secondary);
          padding-top: var(--space-md); /* Reduced from space-2xl */
          padding-bottom: 24px;
        }

        .container {
          max-width: 600px; /* Constrain to mobile width for app feel */
          margin: 0 auto;
          padding: 0 var(--space-md);
        }

        .results-error {
          text-align: center;
          padding: var(--space-3xl);
          background: white;
          margin: var(--space-xl);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
        }

        .health-banner {
          display: flex;
          align-items: center;
          gap: var(--space-lg);
          padding: var(--space-lg);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-lg);
          background: white;
          box-shadow: var(--shadow-sm);
        }

        /* Status Colors */
        .health-banner.healthy .banner-title { color: var(--color-mild); }
        .health-banner.unhealthy .banner-title { color: var(--color-severe); }

        .banner-icon {
          font-size: 3.5rem;
          min-width: 60px;
          text-align: center;
        }

        .banner-content {
          flex: 1;
        }

        .banner-title {
          font-size: var(--font-size-2xl);
          font-weight: 700;
          margin-bottom: 4px;
          line-height: 1.2;
        }

        .banner-subtitle {
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
          margin: 0;
          font-weight: 500;
        }

        .no-deficiency-message, .healthy-message {
          text-align: center;
          padding: var(--space-xl);
          background: white;
          border-radius: var(--radius-lg);
          border: 1px dashed var(--color-mild);
          margin-top: var(--space-md);
        }

        .no-deficiency-message h3, .healthy-message h3 {
          color: var(--color-mild);
          margin-bottom: var(--space-sm);
          font-size: var(--font-size-lg);
        }

        .no-deficiency-message p, .healthy-message p {
          color: var(--color-text-secondary);
          font-size: var(--font-size-sm);
        }

        .scan-metadata-card {
          margin-top: var(--space-lg);
          background: white;
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--color-border);
        }

        .metadata-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--space-lg);
        }

        .metadata-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          border-radius: var(--radius-md);
          background: var(--color-bg-secondary);
          transition: all 0.2s ease;
          position: relative;
        }

        .metadata-item.highlight {
          background: linear-gradient(135deg, rgba(95, 168, 62, 0.08) 0%, rgba(95, 168, 62, 0.03) 100%);
          border: 1px solid rgba(95, 168, 62, 0.2);
        }

        .metadata-item.location-item {
          grid-column: 1 / -1;
        }

        .metadata-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: white;
          color: var(--color-text-secondary);
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .metadata-icon.category-icon {
          background: #E0F2FE;
          color: #0284C7;
        }

        .metadata-icon.scale-icon {
          background: #F3E8FF;
          color: #9333EA;
        }

        .metadata-icon.quantity-icon,
        .metadata-icon.trees-icon {
          background: #D1FAE5;
          color: #059669;
        }

        .metadata-icon.date-icon {
          background: #FEF3C7;
          color: #D97706;
        }

        .metadata-icon.location-icon {
          background: #FEE2E2;
          color: #DC2626;
        }

        .metadata-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .metadata-label {
          font-size: var(--font-size-xs);
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metadata-value {
          font-size: var(--font-size-base);
          font-weight: 600;
          color: var(--color-text-primary);
          line-height: 1.4;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .metadata-value.primary {
          color: var(--color-primary);
          font-size: 1.125rem;
        }

        .metadata-time {
          font-size: var(--font-size-xs);
          font-weight: 500;
          color: var(--color-text-secondary);
          opacity: 0.8;
        }

        .metadata-coords {
          font-size: var(--font-size-xs);
          font-weight: 400;
          color: var(--color-text-secondary);
          font-family: 'Courier New', monospace;
        }

        .map-link {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--color-primary);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .map-link:hover {
          background: var(--color-primary-dark);
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }

        .map-link:active {
          transform: scale(0.95);
        }

        @media (max-width: 600px) {
          .metadata-grid {
            grid-template-columns: 1fr;
            gap: var(--space-md);
          }
          
          .health-banner {
            flex-direction: row;
            text-align: left;
          }
        }

        /* Tablet improvements */
        @media (min-width: 768px) and (max-width: 1023px) {
          .container {
            max-width: 800px;
            padding: 0 var(--space-lg);
          }
        }

        /* Desktop improvements */
        @media (min-width: 1024px) {
          .container {
            max-width: 1200px;
            padding: 0 var(--space-xl);
          }

          .results {
            padding-top: var(--space-3xl);
            position: relative;
            z-index: 1;
          }

          .health-banner {
            padding: var(--space-xl);
          }

          .scan-info {
            padding: var(--space-xl);
          }

          .banner-icon {
            font-size: 4rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Results;
