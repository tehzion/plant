import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation as useRouterLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import {
  ScanLine, AlertCircle, ChevronDown, X, WifiOff
} from 'lucide-react';
import { fetchScanHistoryPage, seedDemoData } from '../utils/localStorage';
import { DEMO_SCANS } from '../utils/demoData';
import AnalysisProgress from '../components/AnalysisProgress.jsx';
import PlantCheckGuide from '../components/PlantCheckGuide.jsx';
import { validCaptureDetails } from '../utils/captureDetails.js';
import CaptureDraftControl from '../components/CaptureDraftControl.jsx';
import CameraUpload from '../components/CameraUpload';
import DataConsentToggle from '../components/DataConsentToggle';
import PlantCategorySelector from '../components/PlantCategorySelector';
import FarmScaleSelector from '../components/FarmScaleSelector';
import ProgressStepper from '../components/ProgressStepper';
import { getRandomPeribahasa, getRandomPeribahasaList } from '../utils/peribahasa';
import CustomModal from '../components/CustomModal';

// Hooks
import { useGreeting } from '../hooks/useGreeting';
import { useLocation } from '../hooks/useLocation';
import { useWeather } from '../hooks/useWeather';
import { useScanContext } from '../context/ScanContext';
import { useAuth } from '../context/AuthContext';

// UI Components
import HeroSection from '../components/home/HeroSection';
import EventProductHero from '../components/home/EventProductHero';
import ActionGrid from '../components/home/ActionGrid';
import WelcomeBanner from '../components/home/WelcomeBanner';
import RecentScans from '../components/home/RecentScans';
import RecentActivity from '../components/home/RecentActivity';
import DueReminders from '../components/home/DueReminders';
import DailyTips from '../components/home/DailyTips';
import FarmingNotices from '../components/home/FarmingNotices';
import './Home.css';
import ScanServiceNotice from '../components/ScanServiceNotice.jsx';
import { useScanService } from '../hooks/useScanService.js';
import ScanCaptureContext from '../components/ScanCaptureContext.jsx';
import ScanPhotoGuidance from '../components/ScanPhotoGuidance.jsx';
import { isFollowUpDue } from '../utils/uiCopy.js';

const Home = () => {
  const [captureContext, setCaptureContext] = useState({ plantPart: 'whole' });
  const { t, language } = useLanguage();
  const label = (key, fallback) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const scanService = useScanService();
  const [leafExpanded, setLeafExpanded] = useState(true);
  const stepHeading = useRef(null);
  const [detailsError, setDetailsError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  // Custom Hooks
  const { getGreeting } = useGreeting();
  const { location, locationName, isLocating, getLocation, setLocationName } = useLocation();
  const { weatherTemp, weatherIcon, forecast, error: weatherError, fetchWeather } = useWeather();
  const { state: scanState, actions: scanActions } = useScanContext();
  const { user, guestId } = useAuth();
  const isMounted = useRef(true);
  const selectedCategoryRef = useRef('');

  // Track mounted state
  useEffect(() => {
    isMounted.current = true;

    // Keep long-running analysis alive. Only reset if a stale loading state survives for several minutes.
    if (scanState.loading && scanState.scanStartTime && (Date.now() - scanState.scanStartTime > 600000)) {
      scanActions.resetScan();
    }

    return () => { isMounted.current = false; };
  }, [scanState.loading, scanState.scanStartTime, scanActions]);

  // View mode is now fully synchronized with URL params.


  // No auto-reset on mount needed - allows background scanning to continue.
  // If scan is running, ScanContext handles it and NotificationToast shows status.
  // User sees Dashboard by default.

  const {
    selectedImage, selectedLeafImage, selectedCategory, selectedScale, scaleQuantity,
    currentStep, loading, error, errorCode, analyzingStep, scanStartTime
  } = scanState;

  useEffect(() => {
    selectedCategoryRef.current = selectedCategory || '';
  }, [selectedCategory]);


  // View State: 'dashboard' | 'scan'
  const [viewMode, setViewMode] = useState('dashboard');

  // UI States
  const [recentScans, setRecentScans] = useState([]);
  const [dueScans, setDueScans] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [weatherResolved, setWeatherResolved] = useState(false);

  // Peribahasa State (UI only)
  const [currentPeribahasa, setCurrentPeribahasa] = useState('');
  const [peribahsaList, setPeribahsaList] = useState([]);
  const [currentPeribahasaIndex, setCurrentPeribahasaIndex] = useState(0);

  // Modal State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
    onConfirm: null
  });
  const [analysisElapsedMs, setAnalysisElapsedMs] = useState(0);
  const [analysisPreviewUrl, setAnalysisPreviewUrl] = useState('');
  const [photoQualityIssue, setPhotoQualityIssue] = useState(null);
  const previousOwner = useRef(scanState.owner);
  useEffect(() => {
    if (previousOwner.current && previousOwner.current !== scanState.owner) {
      setCaptureContext({ plantPart: 'whole' }); setPhotoQualityIssue(null); setLeafExpanded(true);
      if (routerLocation.state?.retakeReason) navigate(`${routerLocation.pathname}${routerLocation.search}`, { replace: true, state: null });
    }
    previousOwner.current = scanState.owner;
  }, [scanState.owner, navigate, routerLocation]);


  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (!photoQualityIssue && viewMode === 'scan') stepHeading.current?.focus({ preventScroll: true });
  }, [currentStep, error, photoQualityIssue, viewMode]);

  const steps = [
    { label: t('home.step1') },
    { label: t('home.step2') },
    { label: t('home.step3') },
  ];

  // Initialize and Update Dashboard Data
  useEffect(() => {
    if (viewMode === 'dashboard') {
      // Refresh scan history whenever dashboard is active or scan completes
      const fetchHistory = async () => {
        if (user?.id === 'demo-user-123') {
          seedDemoData(user.id, { scans: DEMO_SCANS });
        }
        const historyPage = await Promise.resolve(fetchScanHistoryPage(user?.id ?? null, { limit: 20 }));
        const history = Array.isArray(historyPage?.rows) ? historyPage.rows : [];
        if (!isMounted.current) return;
        setRecentScans(history.slice(0, 4));
        setDueScans(history.filter(scan => isFollowUpDue(scan)));
        setHistoryLoaded(true);
      };
      fetchHistory();
    }
  }, [viewMode, loading, user?.id]); // Added loading to auto-refresh history after background scan

  // Initial Location & Weather
  useEffect(() => {
    if (viewMode === 'dashboard' && !locationName) {
      const initData = async () => {
        // Optimistic Update: Show KL weather immediately while locating
        // This prevents the "--Â°C" flash or hang if GPS is slow
        if (!weatherTemp) {
          await fetchWeather(3.1412, 101.6865);
          setLocationName('Malaysia');
        }

        // Personal location is requested only from the location button.
      };
      initData();
    }
  }, [viewMode]); // Keep location fetch separate to avoid re-fetching on scan updates

  useEffect(() => {
    if (viewMode !== 'dashboard' || weatherResolved) return;

    if (Number.isFinite(weatherTemp) || forecast.length > 0 || weatherError) {
      setWeatherResolved(true);
    }
  }, [viewMode, weatherResolved, weatherTemp, forecast.length, weatherError]);

  // URL-DRIVEN VIEW MODES (Fixes 'Imbas Lagi' and Race Conditions)
  useEffect(() => {
    const isScanMode = searchParams.get('scan') === 'true';

    if (isScanMode) {
      // Provide a stable way to enter scan mode that breaks loops
      if (viewMode !== 'scan') {
        scanActions.resetScan();
        scanActions.setStep(1);
        setViewMode('scan');
      }
    } else {
      // Default to dashboard if no scan param
      if (viewMode !== 'dashboard') {
        setViewMode('dashboard');
      }
    }
  }, [searchParams, viewMode, scanActions]);

  // Peribahasa Logic (Analysis UI)
  useEffect(() => {
    if (loading && currentStep === 3) {
      const list = getRandomPeribahasaList(language, 5);
      setPeribahsaList(list);
      setCurrentPeribahasa(list[0]);

      const interval = setInterval(() => {
        setCurrentPeribahasaIndex(prev => {
          const next = (prev + 1) % list.length;
          setCurrentPeribahasa(list[next]);
          return next;
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [loading, currentStep, language]);

  useEffect(() => {
    if (!(loading && currentStep === 3 && scanStartTime)) {
      setAnalysisElapsedMs(0);
      return undefined;
    }

    const updateElapsed = () => setAnalysisElapsedMs(Date.now() - scanStartTime);
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [loading, currentStep, scanStartTime]);

  useEffect(() => {
    if (!selectedImage) {
      setAnalysisPreviewUrl('');
      return undefined;
    }

    if (typeof selectedImage === 'string') {
      setAnalysisPreviewUrl(selectedImage);
      return undefined;
    }

    if (!(selectedImage instanceof Blob)) {
      setAnalysisPreviewUrl('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedImage);
    setAnalysisPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedImage]);

  const analysisStatusHint = useMemo(() => {
    if (!(loading && currentStep === 3)) return '';
    if (analysisElapsedMs > 120000) {
      return t('common.slowScanHint');
    }
    if (analysisElapsedMs > 60000) {
      return t('common.slowScanHint');
    }
    if (analysisElapsedMs > 20000) {
      return t('home.analysisNetworkHint') || 'Uploading large photos may take longer on mobile data. Please keep this screen open.';
    }
    return '';
  }, [analysisElapsedMs, currentStep, loading, t]);

  const errorSupportHint = useMemo(() => {
    if (!errorCode) return '';
    if (errorCode === 'ANALYSIS_NETWORK') {
      return t('home.analysisNetworkSupport') || 'Reconnect to Wi-Fi or mobile data, then try the scan again.';
    }
    if (errorCode === 'ANALYSIS_TIMEOUT') {
      return t('home.analysisTimeoutSupport') || 'Try again with a stronger connection or a smaller image.';
    }
    if (errorCode === 'ANALYSIS_UNAVAILABLE') {
      return t('home.analysisUnavailableSupport') || 'The service is busy right now. Please wait a little and retry.';
    }
    return '';
  }, [errorCode, t]);

  const isConnectionFailure = errorCode === 'ANALYSIS_OFFLINE' || errorCode === 'ANALYSIS_NETWORK';

  // Analysis failure: SET_ERROR always sets currentStep to 3, so just check error + not loading.
  const hasAnalysisFailure = !loading && Boolean(error);

  const handleCategorySelect = (category) => {
    selectedCategoryRef.current = category || '';
    scanActions.setCategory(category);
  };

  const runAnalysisAndNavigate = async (categoryOverride = '') => {
    try {
      const activeCategory = categoryOverride || selectedCategory || selectedCategoryRef.current || '';
      const scanId = await scanActions.performAnalyze(location, locationName, {
        selectedCategory: activeCategory,
        captureContext,
      });
      const currentSearch = new URLSearchParams(window.location.search);
      if (isMounted.current && scanId && currentSearch.get('scan') === 'true') {
        navigate(`/results/${scanId}`);
      }
    } catch {
      // Error state is owned by useScanLogic and rendered by the analysis failure card.
    }
  };

  // Handlers
  const handleStartScan = () => {
    setPhotoQualityIssue(null);
    setSearchParams({ scan: 'true' });
  };

  const handleMinimize = () => {
    setSearchParams({}); // Exits scan viewMode -> triggers 'dashboard' mode
    scanActions.showBackgroundNotification(); // Force the background notification since we manually minimized
  };

  const handleResetAndClose = () => {
    const exit = () => {
      scanActions.resetScan();
      setPhotoQualityIssue(null);
      setSearchParams({});
    };

    // UX Improvement: If on Step 1 and no image selected, exit immediately without confirmation
    if (scanState.currentStep === 1 && !scanState.selectedImage) {
      exit();
      return;
    }

    setModalConfig({
      isOpen: true,
      title: t('home.confirmExit'),
      message: t('home.confirmExitMessage'),
      type: 'confirm',
      confirmText: t('common.exit'),
      cancelText: t('common.continueScan'),
      onConfirm: exit
    });
  };

  const handleNextStep = async () => {
    if (currentStep === 2 && await scanService.retry() !== 'online') return;
    if (currentStep === 1 && !selectedImage) {
      scanActions.setError(t('home.errorNoImage'));
      return;
    }
    const activeCategory = selectedCategory || selectedCategoryRef.current || '';
    if (currentStep === 2 && !activeCategory) {
      setDetailsError(t('home.errorNoCategory'));
      return;
    }
    if (currentStep === 2 && !validCaptureDetails(scanState)) { setDetailsError(t('results.detailsInvalid')); document.getElementById('scan-scale-quantity')?.focus(); return; }
    setDetailsError('');
    if (currentStep === 2 && activeCategory !== selectedCategory) {
      scanActions.setCategory(activeCategory);
    }

    scanActions.nextStep();

    if (currentStep === 2) {
      await runAnalysisAndNavigate(activeCategory);
    }
  };

  const canRepeat = validCaptureDetails(scanState);
  const handleRepeatScan = async () => {
    if (!selectedImage || (routerLocation.state?.retakeReason && !selectedLeafImage) || !canRepeat) return;
    if (await scanService.retry() !== 'online') return;
    scanActions.setStepClear(3);
    await runAnalysisAndNavigate(selectedCategory);
  };

  const handleRetryAnalysis = async () => {
    if (await scanService.retry() !== 'online') return;
    if (!selectedImage) {
      scanActions.setStep(1);
      scanActions.setError(t('home.errorNoImage'));
      return;
    }
    await runAnalysisAndNavigate();
  };


  const handleLocationClick = () => {
    setLocationName(t('common.locating'));
    getLocation().then(loc => loc && fetchWeather(loc.lat, loc.lng));
  };

  // Retry where we last looked; before a location is known that is the
  // Kuala Lumpur default the dashboard opens with.
  const handleWeatherRetry = () => {
    fetchWeather(location?.lat ?? 3.1412, location?.lng ?? 101.6865);
  };

  const handleFeatureStub = (featureName) => {
    setModalConfig({
      isOpen: true,
      title: featureName || t('common.comingSoonTitle'),
      message: t('common.featureUnderDev'),
      type: 'alert'
    });
  };

  const captureDraftControl = <CaptureDraftControl owner={user?.id ? `user:${user.id}` : guestId ? `guest:${guestId}` : null} state={{ ...scanState, captureContext, retakeReason: routerLocation.state?.retakeReason || '' }} onResume={draft => {
    scanActions.restoreDraft(draft);
    setCaptureContext(draft.captureContext);
    setLeafExpanded(Boolean(draft.retakeReason || draft.selectedLeafImage));
    navigate('/?scan=true', { state: { retakeReason: draft.retakeReason } });
    requestAnimationFrame(() => { window.scrollTo({ top: 0, behavior: 'instant' }); stepHeading.current?.focus({ preventScroll: true }); });
  }} />;
  const showHomeSkeleton = viewMode === 'dashboard' && !historyLoaded;

  const renderHomeSkeleton = () => (
    <div className="home-dashboard-skeleton" aria-hidden="true">
      <section className="home-skeleton-hero app-surface">
        <div className="home-skeleton-line home-skeleton-line-greeting"></div>
        <div className="home-skeleton-pill-row">
          <div className="home-skeleton-pill"></div>
          <div className="home-skeleton-pill home-skeleton-pill-compact"></div>
        </div>
      </section>

      <section className="home-skeleton-section">
        <div className="home-skeleton-section-header">
          <div className="home-skeleton-line home-skeleton-line-title"></div>
        </div>
        <div className="home-skeleton-actions">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`action-${index}`} className="home-skeleton-action-card app-surface">
              <div className="home-skeleton-icon"></div>
              <div className="home-skeleton-line home-skeleton-line-label"></div>
            </div>
          ))}
        </div>
      </section>

      <section className="home-skeleton-section">
        <div className="home-skeleton-section-header">
          <div className="home-skeleton-line home-skeleton-line-title"></div>
          <div className="home-skeleton-line home-skeleton-line-link"></div>
        </div>
        <div className="home-skeleton-cards">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`scan-${index}`} className="home-skeleton-scan-card app-surface">
              <div className="home-skeleton-scan-media"></div>
              <div className="home-skeleton-card-body">
                <div className="home-skeleton-line home-skeleton-line-card-title"></div>
                <div className="home-skeleton-line home-skeleton-line-card-meta"></div>
                <div className="home-skeleton-chip-row">
                  <div className="home-skeleton-chip"></div>
                </div>
                <div className="home-skeleton-line home-skeleton-line-card-location"></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="home-skeleton-section">
        <div className="home-skeleton-section-header">
          <div className="home-skeleton-line home-skeleton-line-title"></div>
        </div>
        <div className="home-skeleton-notice app-surface">
          <div className="home-skeleton-notice-top">
            <div className="home-skeleton-icon home-skeleton-icon-small"></div>
            <div className="home-skeleton-line home-skeleton-line-subtitle"></div>
            <div className="home-skeleton-chip home-skeleton-chip-small"></div>
          </div>
          <div className="home-skeleton-line home-skeleton-line-body"></div>
          <div className="home-skeleton-line home-skeleton-line-body home-skeleton-line-body-short"></div>
        </div>
      </section>

      <section className="home-skeleton-section">
        <div className="home-skeleton-section-header">
          <div className="home-skeleton-line home-skeleton-line-title"></div>
        </div>
        <div className="home-skeleton-tip-card app-surface">
          <div className="home-skeleton-tip-copy">
            <div className="home-skeleton-chip home-skeleton-chip-medium"></div>
            <div className="home-skeleton-line home-skeleton-line-card-title"></div>
            <div className="home-skeleton-line home-skeleton-line-body"></div>
            <div className="home-skeleton-line home-skeleton-line-body home-skeleton-line-body-short"></div>
          </div>
          <div className="home-skeleton-icon home-skeleton-tip-icon"></div>
        </div>
      </section>
    </div>
  );

  // Render Dashboard
  if (viewMode === 'dashboard') {
    return (
      <div className="dashboard page fade-in">
        <CustomModal
          isOpen={modalConfig.isOpen}
          onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
          onConfirm={() => {
            if (modalConfig.onConfirm) modalConfig.onConfirm();
            setModalConfig(prev => ({ ...prev, isOpen: false }));
          }}
          confirmText={modalConfig.confirmText}
          cancelText={modalConfig.cancelText}
        />
        <div className="container-superapp">
          {showHomeSkeleton ? (
            <>
              <EventProductHero
                onScan={handleStartScan}
                showDemoScenarios={user?.id === 'demo-user-123'}
                onDemoScenario={(scenarioId) => navigate(`/results/${scenarioId}`)}
              />
              {renderHomeSkeleton()}
            </>
          ) : (
            <>
              <WelcomeBanner onStart={handleStartScan} />
              <HeroSection
                greeting={getGreeting()}
                locationName={locationName}
                isLocating={isLocating}
                onLocationClick={handleLocationClick}
                weatherTemp={weatherTemp}
                weatherIcon={weatherIcon}
                weatherError={weatherError}
                onWeatherRetry={handleWeatherRetry}
              />
              {captureDraftControl}

              <EventProductHero
                onScan={handleStartScan}
                showDemoScenarios={user?.id === 'demo-user-123'}
                onDemoScenario={(scenarioId) => navigate(`/results/${scenarioId}`)}
              />

              {/* Follow-up checks and harvest dates that are due. */}
              <DueReminders scans={dueScans} onOpenScan={(id) => navigate(`/results/${id}`)} />

              <div className="home-dashboard-stack">
                <RecentScans
                  scans={recentScans}
                  onSeeAll={() => navigate('/history')}
                  onScanClick={(id) => navigate(`/results/${id}`)}
                  onScan={handleStartScan}
                />

                <RecentActivity />

                <ActionGrid onScan={handleStartScan} />

                {/* Farming Notices — logged-in users only */}
                {user && forecast.length > 0 && (
                  <FarmingNotices forecast={forecast} />
                )}

                <DailyTips />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Render Scan Interface
  return (
    <div className="scan-page page fade-in">
      <CustomModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={() => {
          if (modalConfig.onConfirm) modalConfig.onConfirm();
          setModalConfig(prev => ({ ...prev, isOpen: false }));
        }}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
      />

      <div className="container-superapp home-scan-shell">
        {loading ? (
          <div className="loading-overlay">
            <div className="loading-card">
              {analysisPreviewUrl && (
                <img
                  src={analysisPreviewUrl}
                  alt={t('home.step1Title') || 'Plant photo'}
                  className="analysis-preview-image"
                />
              )}
              <AnalysisProgress step={analyzingStep} />

              {currentPeribahasa && <p className="analysis-proverb">{currentPeribahasa}</p>}

              {analysisStatusHint && (
                <div className="analysis-hint-banner" role="status">
                  <AlertCircle size={16} />
                  <span>{analysisStatusHint}</span>
                </div>
              )}

              <div className="overlay-actions">
                <button onClick={handleMinimize} className="minimize-analysis-button">
                  <ChevronDown size={18} /> {t('home.minimizeScan') || 'Continue Browsing'}
                </button>
                <button onClick={handleResetAndClose} className="cancel-analysis-button">
                  {t('home.cancelScan') || 'Cancel Scan'}
                </button>
              </div>
            </div>
          </div>
        ) : hasAnalysisFailure ? (
          <div className="analysis-failure-shell slide-up">
            <div className={`analysis-failure-card ${isConnectionFailure ? 'analysis-failure-card--offline' : ''}`} role="alert">
              <div className="analysis-failure-icon" aria-hidden="true">
                {isConnectionFailure ? <WifiOff size={24} /> : <AlertCircle size={24} />}
              </div>
              <div className="analysis-failure-copy">
                <h1 ref={stepHeading} tabIndex={-1}>{isConnectionFailure
                  ? label('home.noInternetTitle', 'No internet connection')
                  : label('home.analysisFailedTitle', 'The check could not finish')}</h1>
                <p className="analysis-failure-message">{error}</p>
                <p>{t('results.photoKept')}</p>
                {captureDraftControl}
                <ScanServiceNotice capture />
              </div>
              <div className="analysis-failure-actions">
                <button type="button" className="btn btn-primary" onClick={handleRetryAnalysis}>
                  {t('common.retry') || 'Try Again'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => scanActions.setStepClear(2)}>
                  {t('common.back') || 'Back'}
                </button>
                <button type="button" className="cancel-analysis-button" onClick={handleResetAndClose}>
                  {t('home.cancelScan') || 'Cancel Scan'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="home-scan-stepper">
              <ProgressStepper currentStep={currentStep} steps={steps} onStepClick={(step) => {
                if (step < currentStep) scanActions.setStepClear(step);
              }} />

            </div>

            {error && (
              <div className="error-banner bounce-in">
                <AlertCircle size={20} />
                <div className="error-banner-copy">
                  <span>{error}</span>
                  {errorSupportHint && <small>{errorSupportHint}</small>}
                </div>
                <button onClick={() => scanActions.setError('')} className="close-error" aria-label={t('common.close') || 'Close'}>
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="step-content slide-up">
              {currentStep === 1 && (
                <div className="step-wrapper">
                  <div className="leaf-card-header mb-lg mt-xl">
                    <div className="leaf-icon-circle">
                      <ScanLine size={24} />
                    </div>
                    <div className="leaf-card-text">
                      <h1 ref={stepHeading} tabIndex={-1} className="scan-step-title mb-xs">{t('home.step1Title')}</h1>
                      {!routerLocation.state?.retakeReason && <p>{t('home.step1Desc')}</p>}
                    </div>
                  </div>

                  {!selectedImage && !selectedLeafImage && captureDraftControl}
                  {routerLocation.state?.retakeReason && <aside className="scan-retake-context" role="note"><p>{routerLocation.state.retakeReason}</p><p>{t('results.retakeSequence')}</p></aside>}
                  {photoQualityIssue && <ScanPhotoGuidance plantPart={captureContext.plantPart} captureRole={photoQualityIssue.role} qualityIssue={photoQualityIssue.code} onDismissIssue={() => setPhotoQualityIssue(null)} />}
                  <div className="capture-photo-grid">
                  <div>
                    <CameraUpload
                      onImageCapture={file => { setPhotoQualityIssue(null); scanActions.handleImageCapture(file); }}
                      key={`${scanState.owner}-whole`}
                      showGuidance={false}
                      captureRole="whole"
                      onQualityIssue={(code, role) => setPhotoQualityIssue({ code, role })}
                      currentImage={selectedImage}
                    />
                  </div>

                  {/* Leaf Image Upload (Optional) */}
                  <details className="leaf-upload-card ui-disclosure mb-lg fade-in-delayed" open={Boolean(selectedLeafImage) || leafExpanded} onToggle={event => setLeafExpanded(event.currentTarget.open)}>
                    <summary>{t(routerLocation.state?.retakeReason ? 'results.retakeCloseup' : 'results.optionalCloseup')}</summary>
                    <CameraUpload
                      onImageCapture={file => { setPhotoQualityIssue(null); scanActions.handleLeafImageCapture(file); }}
                      key={`${scanState.owner}-closeup`}
                      showGuidance={false}
                      captureRole="closeup"
                      required={Boolean(routerLocation.state?.retakeReason)}
                      onQualityIssue={(code, role) => setPhotoQualityIssue({ code, role })}
                      currentImage={selectedLeafImage}
                    />
                  </details>

                  </div>
                  <PlantCheckGuide />
                  <details className="ui-disclosure">
                    <summary>{t('results.optionalSymptoms')}</summary>
                    <ScanCaptureContext value={captureContext} onChange={setCaptureContext} disabled={loading} />
                  </details>
                  {(selectedImage || selectedLeafImage) && captureDraftControl}
                  <ScanServiceNotice capture />
                  {canRepeat && <section className="repeat-scan-details" aria-label={t('results.lastDetails')}>
                    <h2>{t('results.lastDetails')}</h2><p>{scanState.selectedCrop || t(`home.category${selectedCategory.replace(/[^a-zA-Z0-9]/g, '')}`)} · {selectedScale === 'personal' ? t('home.personalScale') : <>{new Intl.NumberFormat(language).format(Number(scaleQuantity))} {t(`results.${selectedScale}${Number(scaleQuantity) === 1 ? 'Unit' : 'Units'}`)}</>}</p>
                    <DataConsentToggle disabled={loading} />
                  </section>}
                  <div className="step-actions mt-xl">
                    <button className="btn btn-secondary" onClick={handleResetAndClose}>{t('common.cancel')}</button>
                    {canRepeat && <button className="btn btn-secondary" onClick={() => scanActions.setStepClear(2)}>{t('results.changeDetails')}</button>}
                    <button className="btn btn-primary" onClick={canRepeat ? handleRepeatScan : handleNextStep} disabled={!selectedImage || Boolean(routerLocation.state?.retakeReason && !selectedLeafImage) || (canRepeat && (scanService.checking || ['offline', 'unavailable'].includes(scanService.status)))}>{t(canRepeat ? 'results.repeatAnalyse' : 'common.next')}</button>
                  </div>


                </div>
              )}

              {currentStep === 2 && (
                <div className="step-wrapper">
                  <div className="step-header mb-lg mt-xl">
                    <h1 ref={stepHeading} tabIndex={-1} className="scan-step-title">{t('home.step2Title')}</h1>
                    <p>{t('home.step2Desc')}</p>
                  </div>
                  <PlantCategorySelector
                    selected={selectedCategory}
                    onSelect={handleCategorySelect}
                    crop={scanState.selectedCrop}
                    onCropSelect={scanActions.setCrop}
                  />

                  {detailsError && <p role="alert">{detailsError}</p>}
                  <div className="scale-selection-section mt-md">

                    <FarmScaleSelector
                      selected={selectedScale}
                      onSelect={scanActions.setScale}
                      quantity={scaleQuantity}
                      onQuantityChange={scanActions.setQuantity}
                      selectedCategory={selectedCategory}
                    />
                  </div>

                  <DataConsentToggle disabled={loading} />

                  {(selectedImage || selectedLeafImage) && captureDraftControl}
                  <ScanServiceNotice capture />
                  <div className="step-actions">
                    <button className="btn btn-secondary" onClick={scanActions.prevStep}>{t('common.back')}</button>
                    <button className="btn btn-primary" disabled={scanService.checking || ['offline', 'unavailable'].includes(scanService.status)} onClick={handleNextStep}>{t('home.analyzeButton')}</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;
