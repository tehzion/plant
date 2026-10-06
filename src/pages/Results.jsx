import { getEnhancementCopy } from '../utils/enhancementCopy.js';
import { getUiCopy } from '../utils/uiCopy.js';
﻿import { useNavigate, useParams } from 'react-router-dom';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getScanById } from '../utils/localStorage';
import { useLanguage } from '../i18n/i18n.jsx';
import translations from '../i18n/translations';
import QuickActions from '../components/QuickActions';
import TabbedResults from '../components/TabbedResults';
import DiseaseResult from '../components/DiseaseResult';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

import { Search, Pill, Sprout, ShoppingBag, MapPin, ExternalLink, ClipboardList } from 'lucide-react';
import { showToast } from '../utils/toast';

import { getScanResultState, getStandardizedStatus } from '../utils/statusUtils';
import { getDiagnosisStatusLabel } from '../utils/diagnosisStatusLabels.js';
import { getNutrientNames, normalizeNutritionalIssues } from '../utils/nutritionUtils.js';
import { localizeStoredAnalysisResult as refreshStoredAnalysisLanguage } from '../utils/diseaseDetection.js';
import { buildFollowUpDraftFromScan, saveFollowUpDraft } from '../utils/scanFollowUpDraft.js';
import { lazyWithRetry } from '../utils/lazyWithRetry.js';
import './Results.css';
import { buildScanResultModel } from '../utils/scanResultModel.js';
import ScanDecisionSummary, { nextScanStep } from '../components/ScanDecisionSummary.jsx';
import { getScanQualityCopy } from '../../shared/scanQualityCopy.js';
import { confidencePercent } from '../../shared/scanResultPolicy.js';
import ScanFollowUpTracker from '../components/ScanFollowUpTracker.jsx';
import { useProductRecommendations } from '../hooks/useProductRecommendations.js';

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
  const [activeResultTab, setActiveResultTab] = useState(0);
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [scan, setScan] = useState(null);
  const [originalScan, setOriginalScan] = useState(null);
  const translationRequest = useRef(0);
  useEffect(() => { translationRequest.current++; setTranslating(false); setTranslationError(false); return () => { translationRequest.current++; }; }, [id, language]);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(false);
  const enhancementCopy = getEnhancementCopy(language);
  const [scanLoading, setScanLoading] = useState(true);
  const label = useCallback((key, fallback) => {
    const translated = t(key);
    return translated && translated !== key ? translated : fallback;
  }, [t]);

  useEffect(() => {
    setScanLoading(true);
    Promise.resolve(getScanById(id, user?.id ?? null))
      .then(result => {
        setScan(result);
        setOriginalScan(result);
        setTranslationError(false);
        setScanLoading(false);
      })
      .catch(() => {
        setScan(null);
        setScanLoading(false);
      });
  }, [id, user?.id]);

  const translateAnalysis = async () => {
    if (!originalScan || translating) return;
    const request = ++translationRequest.current;
    setTranslating(true); setTranslationError(false);
    try {
      const localized = await refreshStoredAnalysisLanguage(originalScan, language);
      if (request !== translationRequest.current) return;
      if (localized?.analysisLanguage !== language) throw new Error('Translation unavailable');
      setScan(current => current?.id === localized.id ? { ...current, ...localized, followUp: current.followUp, plot_id: current.plot_id } : current);
    } catch { if (request === translationRequest.current) setTranslationError(true); }
    finally { if (request === translationRequest.current) setTranslating(false); }
  };

  const result = useMemo(() => buildScanResultModel(scan || {}, language), [scan, language]);
  const productRecommendationState = useProductRecommendations({
    plantType: result.plantType || '',
    disease: result.disease || '',
    scanResult: result,
    language,
    enabled: Boolean(scan && !scanLoading),
  });
  const normalizedNutrition = result.nutritionalIssues;
  const scanCopy = getScanQualityCopy(language);
  const scoreText = value => {
    const score = confidencePercent(value);
    return score === null ? t('results.notRecorded') : `${Math.round(score)}%`;
  };

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
  const healthy = result.healthy;
  const followUpDraft = buildFollowUpDraftFromScan({
    ...result,
  }, language);
  const followUpActionLabel = followUpDraft.activity_type === 'inspect'
    ? label('results.logRoutineCheck', 'Log routine check')
    : followUpDraft.activity_type === 'scout'
      ? label('results.logFieldScouting', 'Log field scouting')
      : label('results.logTreatmentAction', 'Log treatment action');

  const handleScanAgain = () => {
    navigate('/?scan=true');
  };

  const handleLogFollowUp = () => {
    const saved = saveFollowUpDraft(followUpDraft);
    if (!saved) {
      showToast(
        label('results.followUpDraftFailed', 'Could not prepare the follow-up log. Please try again.'),
        'error',
      );
      return;
    }
    navigate('/profile?tab=notes&draft=scan-follow-up');
  };

  const handleDownload = async () => {
    showToast(t('results.generatingPDF'), 'info', 10000);

    try {
      const scanForExport = {
        ...result,
      };
      let productRecommendations = productRecommendationState.data;
      if (!productRecommendations && (scanForExport.plantType || scanForExport.disease)) {
        try {
          productRecommendations = await productRecommendationState.load();
        } catch (productError) {
          console.warn('Unable to preload live product recommendations for PDF export:', productError);
          productRecommendations = null;
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
    const nutritionRecommendations = result.sectionPolicy?.showNutritionProducts && !normalizedNutrition.unconfirmedDueToEvidence && Array.isArray(scan.fertilizerRecommendations)
      ? scan.fertilizerRecommendations.map((recommendation) => {
        const name = recommendation?.fertilizerName || recommendation?.product || recommendation?.name;
        if (!name) return '';
        const details = [recommendation.applicationMethod || recommendation.application, recommendation.frequency, recommendation.amount || recommendation.dosage]
          .filter(Boolean)
          .join(' · ');
        return details ? `${name}: ${details}` : name;
      }).filter(Boolean)
      : [];
    const nutritionStoreProducts = result.sectionPolicy?.showNutritionProducts
      ? [
        ...(productRecommendationState.data?.fertilizers || []),
        ...(productRecommendationState.data?.supplements || []),
      ].map((product) => product?.name).filter(Boolean)
      : [];
    const resultIssueLabel = result.sectionPolicy?.nutritionPrimary
      ? (normalizedNutrition.status === 'confirmed' ? t('results.nutrientDeficiencyDetected') : t('results.possibleNutrientIssue'))
      : (result.disease || t('results.unknownDisease'));
    const nutritionBlock = normalizedNutrition.unconfirmedDueToEvidence ? `${t('results.nutritionalIssues')}: ${t('results.nutritionNotConfirmed')}` : normalizedNutrition.status === 'confirmed'
      ? `
${t('results.nutritionalIssues')}:
${t('results.nutritionStatusConfirmed')}: ${t('results.confirmedDeficiency')}
${t('results.lackingNutrients')}: ${nutrientNames.join(', ')}
${t('results.symptoms')}: ${nutrientSymptoms.join(', ')}
${t('results.severity')}: ${normalizedNutrition.severity}
${nutritionRecommendations.length > 0 ? `${t('results.fertilizerRecommendations')}:\n${nutritionRecommendations.map((item, i) => `${i + 1}. ${item}`).join('\n')}` : ''}
${nutritionStoreProducts.length > 0 ? `${t('results.recommendedProducts')}: ${nutritionStoreProducts.join(', ')}` : ''}
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
          nutritionRecommendations.length > 0 ? `${t('results.fertilizerRecommendations')}: ${nutritionRecommendations.join('; ')}` : '',
          nutritionStoreProducts.length > 0 ? `${t('results.recommendedProducts')}: ${nutritionStoreProducts.join(', ')}` : '',
        ].filter(Boolean).join('\n')
        : (nutritionRecommendations.length > 0 || nutritionStoreProducts.length > 0)
          ? [
              `${t('results.nutritionalIssues')}:`,
              nutritionRecommendations.length > 0 ? `${t('results.fertilizerRecommendations')}: ${nutritionRecommendations.join('; ')}` : '',
              nutritionStoreProducts.length > 0 ? `${t('results.recommendedProducts')}: ${nutritionStoreProducts.join(', ')}` : '',
            ].filter(Boolean).join('\n')
          : '';

    const report = `
${t('pdf.title')}
${scanCopy.scoreNote}
============================================

${t('common.date')}: ${reportDate}
${t('results.plantType')}: ${result.plantType}
${t('results.category')}: ${categoryLabel}
${t('results.scale')}: ${result.farmScale || t('results.notSpecified')}
${result.estimatedAge ? `${t('results.estimatedAge')}: ${result.estimatedAge}` : ''}

${t('results.status')}: ${getDiagnosisStatusLabel(t, result.resultState)}
${t('results.disease')}: ${resultIssueLabel}
${!result.sectionPolicy?.nutritionPrimary && result.fungusType ? `${t('results.fungusSpecies')}: ${result.fungusType}` : ''}
${!result.sectionPolicy?.nutritionPrimary && result.pathogenType ? `${t('results.pathogenType')}: ${result.pathogenType}` : ''}
${t('results.confidence')}: ${scoreText(result.confidence)}
${result.confidenceBreakdown ? `${t('results.diagnosisConfidence') || 'Diagnosis confidence'}: ${scoreText(result.confidenceBreakdown.diagnosisConfidence)}` : ''}
${result.confidenceBreakdown ? `${t('results.imageQualityConfidence') || 'Image quality confidence'}: ${scoreText(result.confidenceBreakdown.imageQualityConfidence)}` : ''}
${t('results.severity')}: ${t(`results.${result.severity?.toLowerCase()}`) || result.severity}
${result.resultState ? `${t('results.diagnosisStatus') || 'Diagnosis status'}: ${getDiagnosisStatusLabel(t, result.resultState)}` : ''}
${result.diagnosticEvidence?.likelyCauseCategory ? `${t('results.likelyCauseCategory') || 'Likely cause'}: ${result.diagnosticEvidence.likelyCauseCategory}` : ''}

${t('results.symptoms')}:
${normalizeList(result.symptoms).map((symptom, i) => `${i + 1}. ${symptom}`).join('\n')}

${!healthy ? `
${t('results.immediateActions')}:
${normalizeList(result.immediateActions).map((action, i) => `${i + 1}. ${action}`).join('\n')}

${result.treatmentEligible ? `${t('results.treatments')}:\n${normalizeList(result.treatments).map((treatment, i) => `${i + 1}. ${treatment}`).join('\n')}` : `${scanCopy.next}: ${nextScanStep(result, scanCopy)}`}
` : ''}

${result.healthyCarePlan ? `
${t('results.dailyCare')}:
${normalizeList(result.healthyCarePlan.dailyCare).map((care, i) => `${i + 1}. ${care}`).join('\n')}

${t('results.weeklyCare')}:
${normalizeList(result.healthyCarePlan.weeklyCare).map((care, i) => `${i + 1}. ${care}`).join('\n')}

${t('results.monthlyCare')}:
${normalizeList(result.healthyCarePlan.monthlyCare).map((care, i) => `${i + 1}. ${care}`).join('\n')}

${t('results.bestPractices')}:
${normalizeList(result.healthyCarePlan.bestPractices).map((practice, i) => `${i + 1}. ${practice}`).join('\n')}
` : ''}

${t('results.prevention')}:
${normalizeList(result.prevention).map((prev, i) => `${i + 1}. ${prev}`).join('\n')}

${nutritionBlock}

${t('common.note')}:
${result.additionalNotes}

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
    const nutritionRecommendations = result.sectionPolicy?.showNutritionProducts && !normalizedNutrition.unconfirmedDueToEvidence
      ? (Array.isArray(scan.fertilizerRecommendations) ? scan.fertilizerRecommendations : [])
      .map((recommendation) => recommendation?.fertilizerName || recommendation?.product || recommendation?.name)
      .filter(Boolean)
      : [];
    const nutritionStoreProducts = result.sectionPolicy?.showNutritionProducts
      ? [
        ...(productRecommendationState.data?.fertilizers || []),
        ...(productRecommendationState.data?.supplements || []),
      ].map((product) => product?.name).filter(Boolean)
      : [];
    const nutritionSummary = normalizedNutrition.unconfirmedDueToEvidence ? `${t('results.nutritionalIssues')}: ${t('results.nutritionNotConfirmed')}` : normalizedNutrition.status === 'confirmed'
      ? `${t('results.nutritionalIssues')}: ${t('results.confirmedDeficiency')}${nutrientNames.length ? ` (${nutrientNames.join(', ')})` : ''}`
      : normalizedNutrition.status === 'possible'
        ? `${t('results.nutritionalIssues')}: ${t('results.possibleNutrientOverlap')}${nutrientNames.length ? ` (${nutrientNames.join(', ')})` : ''}`
        : '';
    const nutritionRecommendationsSummary = [
      nutritionRecommendations.length ? `${t('results.fertilizerRecommendations')}: ${nutritionRecommendations.join(', ')}` : '',
      nutritionStoreProducts.length ? `${t('results.recommendedProducts')}: ${nutritionStoreProducts.join(', ')}` : '',
    ].filter(Boolean).join('\n');
    const resultIssueLabel = result.sectionPolicy?.nutritionPrimary
      ? (normalizedNutrition.status === 'confirmed' ? t('results.nutrientDeficiencyDetected') : t('results.possibleNutrientIssue'))
      : (result.disease || t('results.unknownDisease'));

    const shareText = [
      `${t('pdf.title') || 'Plant Analysis Report'}`,
      `${t('results.plantType')}: ${result.plantType || t('common.unknown')}`,
      `${t('results.disease')}: ${resultIssueLabel}`,
      `${t('results.status')}: ${getDiagnosisStatusLabel(t, result.resultState)}`,
      result.severity ? `${t('results.severity')}: ${t(`results.${result.severity?.toLowerCase()}`) || result.severity}` : '',
      result.confidence !== null ? `${t('results.confidence')}: ${scoreText(result.confidence)}` : '',
      result.resultState ? `${t('results.diagnosisStatus') || 'Diagnosis status'}: ${getDiagnosisStatusLabel(t, result.resultState)}` : '',
      result.diagnosticEvidence?.likelyCauseCategory ? `${t('results.likelyCauseCategory') || 'Likely cause'}: ${result.diagnosticEvidence.likelyCauseCategory}` : '',
      nutritionSummary,
      nutritionRecommendationsSummary,
      `${scanCopy.next}: ${nextScanStep(result, scanCopy)}`,
      scanCopy.scoreNote,
      result.additionalNotes || '',
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
    navigate('/history');
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
      title: healthy ? t('results.care') : result.needsReview ? label('results.nextChecks', 'Next checks') : t('results.treatment'),
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
            scanResult={result}
          />
          <ProductRecommendations
            plantType={result.plantType}
            disease={result.disease}
            farmScale={result.farmScale}
            scanResult={result}
            displayMode="nutrition"
            recommendationState={productRecommendationState}
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
              disease={result.disease}
              farmScale={result.farmScale}
              scanResult={result}
              displayMode="disease"
              recommendationState={productRecommendationState}
            />
          </div>
        </Suspense>
      )
    }
  ];

  return (
    <div className="results page fade-in">
      <div className="container results-layout fade-slide-up">
        <ScanDecisionSummary result={result} />
        {(originalScan?.analysisLanguage || originalScan?.language) !== language && <section className="analysis-language ui-card" aria-busy={translating}>
          <p>{enhancementCopy.source}: {enhancementCopy.languages[originalScan?.analysisLanguage || originalScan?.language] || originalScan?.analysisLanguage || originalScan?.language || enhancementCopy.unknown}</p>
          {scan.analysisLanguage === language && <p role="status">{enhancementCopy.translated}</p>}
          <div className="ui-action-row">
            <button className="btn btn-secondary" disabled={translating || scan.analysisLanguage === language} onClick={translateAnalysis}>{translating ? enhancementCopy.translating : enhancementCopy.translate}</button>
            {scan.analysisLanguage !== (originalScan?.analysisLanguage || originalScan?.language) && <button className="btn btn-secondary" disabled={translating} onClick={() => setScan(current => ({ ...originalScan, followUp: current.followUp, plot_id: current.plot_id }))}>{enhancementCopy.original}</button>}
          </div>
          {translationError && <p role="alert">{enhancementCopy.failed}</p>}
        </section>}
        <div className="results-next-action">
          <button className="btn btn-primary" onClick={result.requiresRetake ? handleScanAgain : result.needsReview ? () => { setActiveResultTab(1); document.getElementById('results-diagnostics')?.scrollIntoView({ block: 'start' }); } : handleLogFollowUp}>
            {result.requiresRetake ? getUiCopy(language).retake : result.needsReview ? getUiCopy(language).inspect : getUiCopy(language).care}
          </button>
        </div>
        {/* Tabbed Results */}
        <div id="results-diagnostics" className="results-diagnostics fade-slide-up" style={{ animationDelay: '0.1s' }}>
          <TabbedResults tabs={tabs} activeIndex={activeResultTab} onTabChange={setActiveResultTab} />
        </div>

        {/* Scan Metadata Card - Modern Design */}
        <details className="scan-metadata-card app-surface app-surface--soft results-secondary">
          <summary className="results-section-kicker">{scanCopy.scanDetails}</summary>
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
        </details>

        <section className="results-followup-group">
        <ScanFollowUpTracker key={`${id}-${user?.id || 'guest'}`} scan={scan} onSaved={metadata => setScan(current => ({ ...current, ...metadata }))} />
        <div className="follow-up-card app-surface app-surface--soft">
          <div className="follow-up-icon">
            <ClipboardList size={22} />
          </div>
          <div className="follow-up-copy">
            <div className="results-section-kicker">{label('results.followUpKicker', 'Farm follow-up')}</div>
            <h3>{label('results.followUpTitle', 'Turn this scan into a farm log')}</h3>
            <p>
              {healthy
                ? label('results.followUpHealthyDesc', 'A routine inspection draft is ready for the Daily Log.')
                : followUpDraft.activity_type === 'scout'
                  ? label('results.followUpScoutDesc', 'A scouting draft is ready so you can verify the issue in the field.')
                  : label('results.followUpTreatmentDesc', 'A treatment draft is ready with the diagnosis, severity, and suggested actions.')}
              {' '}
              {user
                ? label('results.followUpSignedInHint', 'Review and save it in your Daily Log.')
                : label('results.followUpLoginHint', 'Sign in or use the demo account to save it.')}
            </p>
          </div>
          <button type="button" className="follow-up-btn btn btn-primary" onClick={handleLogFollowUp}>
            <ClipboardList size={16} />
            <span>{followUpActionLabel}</span>
          </button>
        </div>

        </section>
        {/* Quick Actions Bar */}
        <QuickActions
          onScanAgain={handleScanAgain}
          onDownload={handleDownload}
          onShare={handleShare}
          onSaveHistory={handleSaveHistory}
        />

        {/* Feedback Widget */}
        <Suspense fallback={RESULTS_SECTION_FALLBACK}>
          <FeedbackWidget scanId={id} scan={scan} />
        </Suspense>



      </div>
    </div >
  );
};

export default Results;
