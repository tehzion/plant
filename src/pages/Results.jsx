import { useDataOwner } from '../context/AuthContext';
import { getEnhancementCopy } from '../utils/enhancementCopy.js';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getScanById } from '../utils/localStorage';
import { useLanguage } from '../i18n/i18n.jsx';
import translations from '../i18n/translations';
import QuickActions from '../components/QuickActions';
import DiseaseResultSections from '../components/disease-result/DiseaseResultSections';
import { buildProductDiagnosisPayload, createProductConsultationFromDiagnosis } from '../utils/liveProductRecommendations.js';
import PlantCheckGuide from '../components/PlantCheckGuide.jsx';
import ScanServiceNotice from '../components/ScanServiceNotice.jsx';
import { getScanTranslation, cacheScanTranslation, localizedText, applyScanTranslation } from '../utils/scanLanguageCache.js';
import { getFieldAnswers, saveFieldAnswerWithStatus, localDateKey } from '../utils/farmerPrefs.js';
import { normalizeDiseaseResult } from '../utils/diseaseResultUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

import { Sprout, MapPin, ExternalLink, ClipboardList, MessageSquareText, History as HistoryIcon, ScanLine } from 'lucide-react';
import { SCAN_PATH } from '../components/navItems.js';
import { showToast } from '../utils/toast';

import { getDiagnosisStatusLabel } from '../utils/diagnosisStatusLabels.js';
import { getNutrientNames } from '../utils/nutritionUtils.js';
import { localizeStoredAnalysisResult as refreshStoredAnalysisLanguage } from '../utils/diseaseDetection.js';
import { buildFollowUpDraftFromScan, saveFollowUpDraft } from '../utils/scanFollowUpDraft.js';
import { lazyWithRetry } from '../utils/lazyWithRetry.js';
import './Results.css';
import { buildScanResultModel } from '../utils/scanResultModel.js';
import ScanDecisionSummary, { nextScanStep } from '../components/ScanDecisionSummary.jsx';
import TodayPlanCard, { recheckDays } from '../components/results/TodayPlanCard.jsx';
import { fetchScanExpertReview } from '../utils/expertReview.js';
import { getScanQualityCopy } from '../../shared/scanQualityCopy.js';
import { confidencePercent } from '../../shared/scanResultPolicy.js';
import ScanFollowUpTracker from '../components/ScanFollowUpTracker.jsx';
import { useProductRecommendations } from '../hooks/useProductRecommendations.js';
import { buildAssistantScanContext, openAssistant, setAssistantScanContext } from '../utils/assistantContext.js';

const NutritionalAnalysis = lazyWithRetry(
  () => import('../components/NutritionalAnalysis'),
  'results-nutritional-analysis',
);
const ProductRecommendations = lazyWithRetry(
  () => import('../components/ProductRecommendations'),
  'results-product-recommendations',
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
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [detailsOpen, setDetailsOpen] = useState(Boolean(requestedTab));
  const { t, language } = useLanguage();
  const { user } = useAuth();
    const dataOwner = useDataOwner();
  const [scan, setScan] = useState(null);
  const [planStarted, setPlanStarted] = useState(() => getFieldAnswers(id, dataOwner)._planStarted === 'yes');
  const [productsOpen, setProductsOpen] = useState(requestedTab === 'products');
  const [cachedLanguage, setCachedLanguage] = useState(false);
  const [planStorageError, setPlanStorageError] = useState(false);
  const [recheckRequest, setRecheckRequest] = useState(null);
  const [expertReview, setExpertReview] = useState(null);
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
    setPlanStarted(getFieldAnswers(id, dataOwner)._planStarted === 'yes');
    setRecheckRequest(null);
    let cancelled = false;
    Promise.resolve(getScanById(id, user?.id ?? null))
      .then(result => {
        if (cancelled) return;
        setScan(result);
        setOriginalScan(result);
        setTranslationError(false);
        setScanLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setScan(null);
        setScanLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, user?.id]);

  // Expert reviews are optional extra context; a failed or offline lookup
  // simply leaves the badge hidden.
  useEffect(() => {
    if (!scan?.id) return undefined;
    let cancelled = false;
    setExpertReview(null);
    fetchScanExpertReview(scan).then(review => { if (!cancelled) setExpertReview(review); }).catch(() => {});
    return () => { cancelled = true; };
  }, [scan?.id, scan?.feedbackToken]);

  const translateAnalysis = async () => {
    if (!originalScan || translating) return;
    const request = ++translationRequest.current;
    setTranslating(true); setTranslationError(false);
    try {
      const localized = await refreshStoredAnalysisLanguage(originalScan, language);
      if (request !== translationRequest.current) return;
      if (localized?.analysisLanguage !== language) throw new Error('Translation unavailable');
      const cached = cacheScanTranslation(originalScan, localized, language, user?.id);
      setCachedLanguage(cached);
      setScan(current => current?.id === originalScan.id ? { ...applyScanTranslation(current, localized), analysisLanguage: language } : current);
    } catch { if (request === translationRequest.current) setTranslationError(true); }
    finally { if (request === translationRequest.current) setTranslating(false); }
  };

  useEffect(() => {
    if (!originalScan) return;
    const cached = getScanTranslation(originalScan, language, user?.id);
    const text = cached || originalScan;
    setScan(current => current?.id === originalScan.id ? { ...text, followUp: current.followUp, plot_id: current.plot_id } : current);
    setCachedLanguage(Boolean(cached));
  }, [originalScan, language, user?.id]);

  const adviceLanguage = scan?.analysisLanguage || scan?.language;
  const adviceReadable = !adviceLanguage || adviceLanguage === language;
  const policyResult = useMemo(() => buildScanResultModel(originalScan || scan || {}, language), [originalScan, scan, language]);
  const result = useMemo(() => {
    const text = localizedText(scan);
    return { ...applyScanTranslation(policyResult, scan), treatments: policyResult.treatmentEligible ? text.treatments || policyResult.treatments : [], immediateActions: policyResult.needsReview ? policyResult.immediateActions : text.immediateActions || policyResult.immediateActions, analysisLanguage: adviceLanguage };
  }, [scan, policyResult, adviceLanguage]);
  const productRecommendationState = useProductRecommendations({
    plantType: result.plantType || '',
    disease: result.disease || '',
    scanResult: policyResult,
    language,
    enabled: Boolean(scan && !scanLoading && !result.needsReview && adviceReadable && detailsOpen && productsOpen),
    scanId: scan?.id || '',
    feedbackToken: scan?.feedbackToken || '',
  });
  // Lets the floating assistant answer follow-ups about this scan.
  const assistantScan = useMemo(() => (scan ? buildAssistantScanContext(result) : null), [scan, result]);
  useEffect(() => {
    setAssistantScanContext(assistantScan);
    return () => setAssistantScanContext(null);
  }, [assistantScan]);
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
          {/* Reached from an old or shared link: the farmer may have plenty of
              history, it is only this scan that is missing on this phone. */}
          <div className="results-error app-surface app-empty-state" role="status">
            <h1 className="results-error-title">{t('history.scanNotFound')}</h1>
            <p>{t('history.scanNotFoundMessage')}</p>
            <div className="results-error-actions">
              <button type="button" onClick={() => navigate('/history')} className="btn btn-primary">
                <HistoryIcon size={18} aria-hidden="true" />
                <span>{t('nav.history')}</span>
              </button>
              <button type="button" onClick={() => navigate(SCAN_PATH)} className="btn btn-secondary">
                <ScanLine size={18} aria-hidden="true" />
                <span>{t('nav.checkPlant')}</span>
              </button>
            </div>
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

  const healthy = result.healthy;
  const followUpDraft = buildFollowUpDraftFromScan({
    ...result,
  }, language);
  const handleScanAgain = () => {
    navigate('/?scan=true', result.requiresRetake ? { state: { retakeReason: adviceReadable ? result.retakeReason || t('results.retakeSequence') : t('results.headlineretake') } } : undefined);
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

  const detailedResult = normalizeDiseaseResult(result, t);
  const suggestRecheck = () => {
    const date = new Date();
    date.setDate(date.getDate() + recheckDays(result));
    setRecheckRequest({ date: localDateKey(date), at: Date.now() });
  };
  const handleAskExpert = () => window.open(createProductConsultationFromDiagnosis(buildProductDiagnosisPayload({ plantType: result.plantType, disease: result.disease, scanResult: result }), undefined, language).url, '_blank', 'noopener,noreferrer');
  const startTreatmentPlan = () => {
    const next = !planStarted;
    setPlanStorageError(!saveFieldAnswerWithStatus(id, '_planStarted', next ? 'yes' : 'no', dataOwner).saved);
    setPlanStarted(next);
  };

  return (
    <div className="results page fade-in">
      <div className="container results-layout fade-slide-up">
        <ScanDecisionSummary result={result} adviceReadable={adviceReadable} expertReview={expertReview} image={scan.image || scan.image_url} />
        {!adviceReadable && !result.requiresRetake && <section className="analysis-language" aria-busy={translating}>
          <p>{t('results.analysisLanguageHint').replace('{language}', enhancementCopy.languages[adviceLanguage] || enhancementCopy.unknown)}</p>
          {(!result.treatmentEligible || result.requiresRetake) && <button type="button" className="btn btn-secondary" disabled={translating} onClick={translateAnalysis}>{t(translating ? 'results.translateBusy' : 'results.translateAdvice')}</button>}
          {translationError && <p role="alert">{t('results.translationUnavailable')}</p>}
          <button type="button" className="btn btn-secondary" onClick={handleAskExpert}>{t('results.actionExpert')}</button>
        </section>}
        {cachedLanguage && adviceReadable && <p className="results-language-saved">{t('results.cachedTranslation')}</p>}
        <TodayPlanCard key={`${id}-${language}`} result={result} sourceResult={policyResult} scanId={id} adviceReadable={adviceReadable} planStorageError={planStorageError} planStarted={planStarted && adviceReadable} onSetRecheck={suggestRecheck} />
        <div className="results-next-action">
          <button type="button" className="btn btn-primary" disabled={translating} aria-expanded={result.treatmentEligible && adviceReadable ? planStarted : undefined} aria-controls={result.treatmentEligible && adviceReadable ? 'today-plan' : undefined} onClick={result.requiresRetake ? handleScanAgain : result.needsReview ? handleAskExpert : healthy ? suggestRecheck : !adviceReadable ? translateAnalysis : startTreatmentPlan}>
            {t(translating ? 'results.translateBusy' : !adviceReadable && result.treatmentEligible ? 'results.translateAdvice' : `results.${result.requiresRetake ? 'actionRetake' : result.needsReview ? 'actionExpert' : healthy ? 'actionHealthy' : planStarted ? 'closePlan' : 'actionTreat'}`)}
          </button>
          {result.needsReview && !result.requiresRetake && <p className="results-expert-channel">{t('results.expertChannel')}</p>}
        </div>
        {!result.requiresRetake && <section className="results-watch" aria-labelledby="watch-title">
          <h2 id="watch-title">{t('results.watchTitle')}</h2>
          <p>{t(healthy ? 'results.watchHealthy' : 'results.watchDisease')}</p>
        </section>}
        <PlantCheckGuide />
        <ScanServiceNotice />
        {!result.requiresRetake && <button type="button" className="btn btn-secondary" onClick={handleLogFollowUp}><ClipboardList size={18} aria-hidden="true" />{t('results.logCare')}</button>}
        {!result.requiresRetake && <ScanFollowUpTracker key={`${id}-${user?.id || 'guest'}`} scan={scan} healthy={healthy} openRequest={recheckRequest} onSaved={metadata => setScan(current => ({ ...current, ...metadata }))} />}
        <details className="results-more" open={detailsOpen} onToggle={event => setDetailsOpen(event.currentTarget.open)}>
          <summary>{t('results.moreDetails')}</summary>
          {detailsOpen && <div className="results-more__content">
          <details className="results-detail-group" open><summary><h2>{t('results.evidenceTitle')}</h2></summary>
          {(scan.leafImage || scan.leaf_image_url) && <img className="results-detail-photo" src={scan.leafImage || scan.leaf_image_url} alt={t('home.addLeafPhoto')} loading="lazy" />}
          {adviceReadable && <DiseaseResultSections normalized={{ ...detailedResult, showDemoModeWarning: false }} t={t} />}
          {adviceReadable && result.diagnosticEvidence.evidenceFor.length > 0 && <ul>{result.diagnosticEvidence.evidenceFor.map((item, i) => <li key={i}>{item}</li>)}</ul>}
          {adviceReadable && [...new Set([result.abstainReason, ...result.diagnosticEvidence.evidenceAgainst].filter(Boolean))].map((item, i) => <p key={i}>{item}</p>)}
          {result.needsReview && !result.requiresRetake && <section><h3>{t('results.expertHelp')}</h3><p>{t('results.expertHelpText')}</p></section>}
          {!adviceReadable && <details className="results-original-advice"><summary>{t('results.sourceLanguageLabel').replace('{language}', enhancementCopy.languages[adviceLanguage] || enhancementCopy.unknown)}</summary><div lang={adviceLanguage}><p>{result.disease}</p>{result.retakeReason && <p>{result.retakeReason}</p>}<ul>{[...result.immediateActions, ...result.treatments].map((item, i) => <li key={i}>{item}</li>)}</ul></div></details>}
          </details>
          {!result.needsReview && adviceReadable && <details className="results-detail-group"><summary><h2>{t('results.detailsCare')}</h2></summary>
            <h3>{healthy ? t('results.care') : t('results.prevention')}</h3>
            <ul>{result.prevention.map((item, i) => <li key={i}>{item}</li>)}</ul>
            {healthy && ['dailyCare', 'weeklyCare', 'monthlyCare', 'bestPractices'].map(key => result.healthyCarePlan?.[key]?.length > 0 && <div key={key}><h3>{t(`results.${key}`)}</h3><ul>{result.healthyCarePlan[key].map((item, i) => <li key={i}>{item}</li>)}</ul></div>)}
            {result.treatmentEligible && result.treatments.length > 1 && <section><h3>{t('results.treatments')}</h3><ol start={2}>{result.treatments.slice(1).map((item, i) => <li key={i}>{item}</li>)}</ol></section>}
            <Suspense fallback={RESULTS_SECTION_FALLBACK}><NutritionalAnalysis nutritionalIssues={normalizedNutrition} fertilizerRecommendations={scan.fertilizerRecommendations} scanResult={result} /></Suspense>
          </details>}
          {!result.needsReview && adviceReadable && <details className="results-detail-group" open={productsOpen} onToggle={event => setProductsOpen(event.currentTarget.open)}><summary><h2>{t('results.detailsProducts')}</h2></summary>
            {productsOpen && <Suspense fallback={RESULTS_SECTION_FALLBACK}>
              {productRecommendationState.error ? <div className="results-catalog-notice" role="status"><p>{t('results.catalogUnavailable')}</p><button type="button" className="btn btn-secondary" onClick={productRecommendationState.retry}>{t('common.retry')}</button></div> : <>
                <ProductRecommendations plantType={result.plantType} disease={result.disease} farmScale={result.farmScale} scanResult={policyResult} displayMode="disease" recommendationState={productRecommendationState} />
                <ProductRecommendations plantType={result.plantType} disease={result.disease} farmScale={result.farmScale} scanResult={policyResult} displayMode="nutrition" recommendationState={productRecommendationState} />
              </>}
            </Suspense>}
          </details>}
          <details className="results-detail-group"><summary><h2>{t('results.detailsTools')}</h2></summary>
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
                            const density = densityMap[categoryRaw] ?? 50;
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
                    aria-label={`${t('results.viewOnMap')}: ${locationNameValue}`}
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

        <button type="button" className="btn btn-secondary" onClick={openAssistant}><MessageSquareText size={18} aria-hidden="true" />{t('assistant.askAboutResult')}</button>
        {/* Quick Actions Bar */}
        <QuickActions
          compact
          onScanAgain={handleScanAgain}
          onDownload={handleDownload}
          onShare={handleShare}
          onSaveHistory={handleSaveHistory}
        />

        {/* Feedback Widget */}
        <details className="results-feedback-details"><summary>{t('feedback.title')}</summary>
        <Suspense fallback={RESULTS_SECTION_FALLBACK}>
          <FeedbackWidget scanId={id} scan={scan} />
        </Suspense>
        </details>
          </details>
        </div>}
        </details>



      </div>
    </div >
  );
};

export default Results;
