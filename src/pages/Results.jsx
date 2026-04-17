﻿import { useNavigate, useParams } from 'react-router-dom';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { getScanById } from '../utils/localStorage';
import { useLanguage } from '../i18n/i18n.jsx';
import translations from '../i18n/translations';
import QuickActions from '../components/QuickActions';
import TabbedResults from '../components/TabbedResults';
import DiseaseResult from '../components/DiseaseResult';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

import { Search, Pill, Sprout, ShoppingBag, MapPin, ExternalLink } from 'lucide-react';
import { showToast } from '../utils/toast';

import { getStandardizedStatus } from '../utils/statusUtils';
import { getNutrientNames, normalizeNutritionalIssues } from '../utils/nutritionUtils.js';
import { localizeStoredAnalysisResult as refreshStoredAnalysisLanguage } from '../utils/diseaseDetection.js';
import {
  createEmptyProductRecommendations,
  fetchLiveProductRecommendations,
} from '../utils/liveProductRecommendations.js';
import { lazyWithRetry } from '../utils/lazyWithRetry.js';
import './Results.css';

const TreatmentRecommendations = lazyWithRetry(
  () => import('../components/TreatmentRecommendations'),
  'results-treatment-recommendations',
);
const NutritionalAnalysis = lazyWithRetry(
  () => import('../components/NutritionalAnalysis'),
  'results-nutritional-analysis',
);
const ProductRecommendations = lazyWithRetry(
  () => import('../components/ProductRecommendations'),
  'results-product-recommendations',
);
const HealthyCarePlan = lazyWithRetry(
  () => import('../components/HealthyCarePlan'),
  'results-healthy-care-plan',
);
const FeedbackWidget = lazyWithRetry(
  () => import('../components/FeedbackWidget'),
  'results-feedback-widget',
);

const RESULTS_SECTION_FALLBACK = (
  <div className="results-section-loading">
    <LoadingSpinner />
  </div>
);

const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [scan, setScan] = useState(null);
  const [scanLoading, setScanLoading] = useState(true);
  const [liveProductRecommendations, setLiveProductRecommendations] = useState(null);

  useEffect(() => {
    setScanLoading(true);
    setLiveProductRecommendations(null);
    Promise.resolve(getScanById(id, user?.id ?? null))
      .then(result => {
        setScan(result);
        setScanLoading(false);
      })
      .catch(() => {
        setScan(null);
        setScanLoading(false);
      });
  }, [id, user?.id]);

  useEffect(() => {
    let cancelled = false;

    const refreshLanguage = async () => {
      if (!scan || scanLoading) return;

      const sourceLanguage = scan.analysisLanguage || scan.language || null;
      if (sourceLanguage === language) return;

      try {
        const localizedScan = await refreshStoredAnalysisLanguage(scan, language);
        if (!cancelled && localizedScan?.analysisLanguage === language) {
          setScan((current) => {
            if (!current || current.id !== localizedScan.id) return current;
            if (current === localizedScan) return current;
            return localizedScan;
          });
        }
      } catch {
        // Keep showing the stored result language if refresh is unavailable.
      }
    };

    refreshLanguage();

    return () => {
      cancelled = true;
    };
  }, [scan, scanLoading, language]);

  const normalizedNutrition = useMemo(
    () => normalizeNutritionalIssues(scan?.nutritionalIssues),
    [scan?.nutritionalIssues],
  );

  const result = useMemo(() => ({
    healthStatus: getStandardizedStatus(scan),
    status: scan?.status || null,
    plantType: scan?.plantType,
    disease: scan?.disease,
    fungusType: scan?.fungusType,
    pathogenType: scan?.pathogenType,
    estimatedAge: scan?.estimatedAge,
    confidence: scan?.confidence,
    confidenceBreakdown: scan?.confidenceBreakdown,
    severity: scan?.severity,
    plantPart: scan?.plantPart,
    symptoms: scan?.symptoms,
    immediateActions: scan?.immediateActions,
    treatments: scan?.treatments,
    prevention: scan?.prevention,
    healthyCarePlan: scan?.healthyCarePlan,
    additionalNotes: scan?.additionalNotes,
    requiresRetake: scan?.requiresRetake,
    retakeReason: scan?.retakeReason,
    abstainReason: scan?.abstainReason,
    differentialDiagnoses: scan?.differentialDiagnoses,
    diagnosticEvidence: scan?.diagnosticEvidence,
    identification: scan?.identification,
    identificationSource: scan?.identificationSource,
    speciesAssessment: scan?.speciesAssessment,
    nutritionalIssues: normalizedNutrition,
    productSearchTags: scan?.productSearchTags || []
  }), [scan, normalizedNutrition]);

  const handleRecommendationsLoaded = useCallback((data) => {
    setLiveProductRecommendations(data);
  }, []);

  if (scanLoading) {
    return (
      <div className="results">
        <div className="container results-layout">
          <div className="results-loading-shell app-surface app-surface--soft app-empty-state">
            <div className="loading-spinner-circle" />
            <p>{t('common.loading') || 'Loading'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="results">
        <div className="container results-layout">
          <div className="results-error app-surface app-empty-state">
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

  const categoryRaw = (scan.category ?? scan.plantType ?? '').toString();
  const categoryKey = categoryRaw.replace(/[^a-zA-Z0-9]/g, '');
  const translatedCategory = categoryKey ? t(`home.category${categoryKey}`) : '';
  const categoryLabel =
    translatedCategory && translatedCategory !== `home.category${categoryKey}`
      ? translatedCategory
      : (categoryRaw || t('common.unknown'));

  const scanDate = scan?.timestamp ? new Date(scan.timestamp) : null;
  const hasValidTimestamp = !!scanDate && !Number.isNaN(scanDate.getTime());
  const dateLocale = t('common.dateLocale') || 'en-US';
  const lat = Number(scan?.location?.lat);
  const lng = Number(scan?.location?.lng);
  const hasValidCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const locationNameRaw = scan?.locationName;
  const locationNameValue = typeof locationNameRaw === 'string' ? locationNameRaw : (locationNameRaw ? String(locationNameRaw) : '');
  const hasLocationName = Boolean(
    locationNameValue
    && locationNameValue !== 'N/A'
    && locationNameValue !== 'common.locationNA'
    && locationNameValue !== t('common.locationNA')
  );

  const standardizedStatus = result.healthStatus;
  const healthy = standardizedStatus === 'healthy';

  const handleScanAgain = () => {
    navigate('/?scan=true');
  };

  const handleDownload = async () => {
    showToast(t('results.generatingPDF'), 'info', 10000);

    try {
      const scanForExport = {
        ...scan,
        nutritionalIssues: normalizedNutrition,
      };
      let productRecommendations = liveProductRecommendations;
      if (!productRecommendations && (scanForExport.plantType || scanForExport.disease)) {
        try {
          productRecommendations = await fetchLiveProductRecommendations({
            plantType: scanForExport.plantType,
            disease: scanForExport.disease,
            scanResult: result,
            language,
          });
        } catch (productError) {
          console.warn('Unable to preload live product recommendations for PDF export:', productError);
          productRecommendations = createEmptyProductRecommendations();
        }
      }

      const { generatePDFReport } = await import('../utils/pdfGenerator');
      await generatePDFReport(scanForExport, language, translations, { productRecommendations });
      showToast(t('results.pdfDownloaded'), 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast(t('results.pdfFailed'), 'error');
      handleDownloadText();
    }
  };

  const handleDownloadText = () => {
    // Fallback: Create a simple text report
    const reportDate = hasValidTimestamp
      ? scanDate.toLocaleString(dateLocale)
      : t('results.notRecorded');

    const normalizeList = (value) => {
      if (Array.isArray(value)) return value.filter(Boolean);
      if (typeof value === 'string') {
        return value
          .split(/\r?\n|•|â€¢/g)
          .map(v => v.trim())
          .filter(Boolean);
      }
      return [];
    };

    const nutrientNames = getNutrientNames(normalizedNutrition);
    const nutrientSymptoms = normalizeList(normalizedNutrition?.symptoms);
    const nutritionBlock = normalizedNutrition.status === 'confirmed'
      ? `
${t('results.nutritionalIssues')}:
${t('results.nutritionStatusConfirmed')}: ${t('results.confirmedDeficiency')}
${t('results.lackingNutrients')}: ${nutrientNames.join(', ')}
${t('results.symptoms')}: ${nutrientSymptoms.join(', ')}
${t('results.severity')}: ${normalizedNutrition.severity}
`
      : normalizedNutrition.status === 'possible'
        ? [
`
${t('results.nutritionalIssues')}:
${t('results.nutritionStatusPossible')}: ${t('results.possibleNutrientOverlap')}
`,
          nutrientNames.length > 0 ? `${t('results.suspectedNutrients')}: ${nutrientNames.join(', ')}` : '',
          normalizedNutrition.reasoning ? `${t('results.nutritionMayAlsoBeContributing')}: ${normalizedNutrition.reasoning}` : '',
          nutrientSymptoms.length > 0 ? `${t('results.symptoms')}: ${nutrientSymptoms.join(', ')}` : '',
        ].filter(Boolean).join('\n')
        : '';

    const report = `
${t('pdf.title')}
============================================

${t('common.date')}: ${reportDate}
${t('results.plantType')}: ${scan.plantType}
${t('results.category')}: ${categoryLabel}
${t('results.scale')}: ${scan.farmScale || t('results.notSpecified')}
${scan.estimatedAge ? `${t('results.estimatedAge')}: ${scan.estimatedAge}` : ''}

${t('results.status')}: ${t(`results.${standardizedStatus}`)}
${t('results.disease')}: ${scan.disease}
${scan.fungusType ? `${t('results.fungusSpecies')}: ${scan.fungusType}` : ''}
${scan.pathogenType ? `${t('results.pathogenType')}: ${scan.pathogenType}` : ''}
${t('results.confidence')}: ${scan.confidence}%
${scan.confidenceBreakdown ? `${t('results.diagnosisConfidence') || 'Diagnosis confidence'}: ${scan.confidenceBreakdown.diagnosisConfidence}%` : ''}
${scan.confidenceBreakdown ? `${t('results.imageQualityConfidence') || 'Image quality confidence'}: ${scan.confidenceBreakdown.imageQualityConfidence}%` : ''}
${t('results.severity')}: ${t(`results.${scan.severity?.toLowerCase()}`) || scan.severity}

${t('results.symptoms')}:
${scan.symptoms}

${!healthy ? `
${t('results.immediateActions')}:
${normalizeList(scan.immediateActions).map((action, i) => `${i + 1}. ${action}`).join('\n')}

${t('results.treatments')}:
${normalizeList(scan.treatments).map((treatment, i) => `${i + 1}. ${treatment}`).join('\n')}
` : ''}

${scan.healthyCarePlan ? `
${t('results.dailyCare')}:
${normalizeList(scan.healthyCarePlan.dailyCare).map((care, i) => `${i + 1}. ${care}`).join('\n')}

${t('results.weeklyCare')}:
${normalizeList(scan.healthyCarePlan.weeklyCare).map((care, i) => `${i + 1}. ${care}`).join('\n')}

${t('results.monthlyCare')}:
${normalizeList(scan.healthyCarePlan.monthlyCare).map((care, i) => `${i + 1}. ${care}`).join('\n')}

${t('results.bestPractices')}:
${normalizeList(scan.healthyCarePlan.bestPractices).map((practice, i) => `${i + 1}. ${practice}`).join('\n')}
` : ''}

${t('results.prevention')}:
${normalizeList(scan.prevention).map((prev, i) => `${i + 1}. ${prev}`).join('\n')}

${nutritionBlock}

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
    const nutrientNames = getNutrientNames(normalizedNutrition);
    const nutritionSummary = normalizedNutrition.status === 'confirmed'
      ? `${t('results.nutritionalIssues')}: ${t('results.confirmedDeficiency')}${nutrientNames.length ? ` (${nutrientNames.join(', ')})` : ''}`
      : normalizedNutrition.status === 'possible'
        ? `${t('results.nutritionalIssues')}: ${t('results.possibleNutrientOverlap')}${nutrientNames.length ? ` (${nutrientNames.join(', ')})` : ''}`
        : '';

    const shareText = [
      `${t('pdf.title') || 'Plant Analysis Report'}`,
      `${t('results.plantType')}: ${scan.plantType || t('common.unknown')}`,
      `${t('results.disease')}: ${scan.disease || t('results.unknownDisease')}`,
      `${t('results.status')}: ${t(`results.${standardizedStatus}`)}`,
      scan.severity ? `${t('results.severity')}: ${t(`results.${scan.severity?.toLowerCase()}`) || scan.severity}` : '',
      scan.confidence ? `${t('results.confidence')}: ${scan.confidence}%` : '',
      nutritionSummary,
      scan.additionalNotes || '',
    ].filter(Boolean).join('\n');

    // Try Native Share API first (Mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('pdf.title') || 'Plant Analysis Report',
          text: shareText,
        });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') console.error('Share failed:', err);
      }
    }

    // Fallback to Clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      showToast(t('results.shareSummaryCopied') || 'Summary copied for sharing.', 'success');
    } catch (err) {
      console.error('Failed to copy link:', err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        showToast(t('results.shareSummaryCopied') || 'Summary copied for sharing.', 'success');
      } catch (err) {
        console.error('Fallback copy failed', err);
        showToast(t('results.shareSummaryCopyFailed') || 'Failed to copy summary.', 'error');
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
      content: <DiseaseResult result={result} image={scan.image || scan.image_url} leafImage={scan.leafImage || scan.leaf_image_url} />
    },
    {
      icon: <Pill size={20} />,
      title: healthy ? t('results.care') || 'Care' : t('results.treatment'),
      content: (
        <Suspense fallback={RESULTS_SECTION_FALLBACK}>
          <div>
            {!healthy ? (
              <TreatmentRecommendations result={result} />
            ) : (
              <HealthyCarePlan carePlan={scan.healthyCarePlan} plantType={scan.plantType} />
            )}
          </div>
        </Suspense>
      )
    },
    {
      icon: <Sprout size={20} />,
      title: t('results.nutrition'),
      badge: normalizedNutrition.status === 'confirmed' ? '!' : (normalizedNutrition.status === 'possible' ? '?' : null),
      content: (
        <Suspense fallback={RESULTS_SECTION_FALLBACK}>
          <NutritionalAnalysis
            nutritionalIssues={normalizedNutrition}
            fertilizerRecommendations={scan.fertilizerRecommendations}
          />
        </Suspense>
      )
    },
    {
      icon: <ShoppingBag size={20} />,
      title: t('results.products'),
      content: (
        <Suspense fallback={RESULTS_SECTION_FALLBACK}>
          <div>
            <ProductRecommendations
              plantType={scan.plantType}
              disease={scan.disease}
              farmScale={scan.farmScale}
              scanResult={result}
              onRecommendationsLoaded={handleRecommendationsLoaded}
            />
          </div>
        </Suspense>
      )
    }
  ];

  return (
    <div className="results page fade-in">
      <div className="container results-layout fade-slide-up">
        {/* Quick Actions Bar */}
        <QuickActions
          onScanAgain={handleScanAgain}
          onDownload={handleDownload}
          onShare={handleShare}
          onSaveHistory={handleSaveHistory}
        />

        {/* Scan Metadata Card - Modern Design */}
        <div className="scan-metadata-card app-surface app-surface--soft">
          <div className="results-section-kicker">{t('results.plantDetails') || 'Scan details'}</div>
          <div className="metadata-grid">
            {/* Category */}
            <div className="metadata-item">
              <div className="metadata-icon category-icon">
                <Sprout size={20} />
              </div>
              <div className="metadata-content">
                <span className="metadata-label">{t('results.category')}</span>
                <span className="metadata-value">{categoryLabel}</span>
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
                <span className="metadata-label">{t('results.scale')}</span>
                <span className="metadata-value">
                  {scan.farmScale === 'acre' && t('home.acreScale')}
                  {scan.farmScale === 'tree' && t('home.treeScale')}
                  {scan.farmScale === 'personal' && t('home.personalScale')}
                  {!scan.farmScale && t('results.notSpecified')}
                  {scan.scaleQuantity && Number(scan.scaleQuantity) > 0 && (
                    <div className="metadata-scale-detail">
                      <span>
                        ({scan.scaleQuantity}{' '}
                        {scan.farmScale === 'acre' ? t('home.acres') :
                          scan.farmScale === 'tree' ? t('home.trees') :
                            t('home.plants')})
                      </span>
                      {/* Show Estimated Trees for Acre Scale */}
                      {scan.farmScale === 'acre' && (
                        <span className="metadata-scale-estimate">
                          ~ {(() => {
                            const densityMap = {
                              'Durian': 35, 'Coconut': 60, 'Banana': 500, 'Cocoa': 450,
                              'Pepper': 700, 'Pineapple': 12000, 'Corn': 20000, 'Rubber': 190,
                              'Palm/Rubber': 130, 'Palm Oil': 55, 'Vegetables': 0, 'Fruits': 0,
                              'Rice': 0, 'Weed Control': 0
                            };
                            const density = densityMap[categoryRaw] || 50;
                            if (density === 0) return '';
                            return `${Math.round(scan.scaleQuantity * density).toLocaleString()} ${t('home.trees')}`;
                          })()}
                        </span>
                      )}
                    </div>
                  )}
                </span>
              </div>
            </div>

            {/* Location */}
            {hasLocationName && (
              <div className="metadata-item metadata-item--location">
                <div className="metadata-icon location-icon">
                  <MapPin size={20} />
                </div>
                <div className="metadata-content">
                  <span className="metadata-label">{t('common.location')}</span>
                  <span className="metadata-value">
                    {locationNameValue.startsWith('common.')
                      ? t(locationNameValue)
                      : locationNameValue}
                  </span>
                  {hasValidCoords && (
                    <span className="metadata-coords">
                      {lat.toFixed(4)}, {lng.toFixed(4)}
                    </span>
                  )}
                </div>
                {hasValidCoords && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="map-link-small"
                    title={t('results.viewOnMap')}
                  >
                    <ExternalLink size={12} />
                  </a>
                )}
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
                  {hasValidTimestamp ? scanDate.toLocaleDateString(dateLocale) : t('results.notRecorded')}
                  {hasValidTimestamp && (
                    <span className="metadata-time">
                      {scanDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Results */}
        <div className="fade-slide-up" style={{ animationDelay: '0.1s' }}>
          <TabbedResults tabs={tabs} />
        </div>

        {/* Feedback Widget */}
        <Suspense fallback={RESULTS_SECTION_FALLBACK}>
          <FeedbackWidget scanId={id} scan={scan} />
        </Suspense>



      </div>
    </div >
  );
};

export default Results;
