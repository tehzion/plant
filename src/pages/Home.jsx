import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation as useRouterLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import {
  ScanLine, AlertCircle, Leaf, ChevronDown
} from 'lucide-react';
import { checkServerHealth } from '../utils/diseaseDetection';
import { getScanHistory } from '../utils/localStorage';
import CameraUpload from '../components/CameraUpload';
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
import ServerStatus from '../components/home/ServerStatus';
import ActionGrid from '../components/home/ActionGrid';
import RecentScans from '../components/home/RecentScans';
import DailyTips from '../components/home/DailyTips';
import ServicesGrid from '../components/home/ServicesGrid';
import FarmingNotices from '../components/home/FarmingNotices';
import './Home.css';

const Home = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Custom Hooks
  const { getGreeting } = useGreeting();
  const { location, locationName, isLocating, getLocation, setLocationName } = useLocation();
  const { weatherTemp, weatherIcon, forecast, error: weatherError, fetchWeather } = useWeather();
  const { state: scanState, actions: scanActions } = useScanContext();
  const { user } = useAuth();
  const isMounted = useRef(true);

  // Track mounted state
  useEffect(() => {
    isMounted.current = true;

    // STALE SCAN CHECK: If returning to page and scan is old (>15s), auto-reset
    if (scanState.loading && scanState.scanStartTime && (Date.now() - scanState.scanStartTime > 15000)) {
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

  // View State: 'dashboard' | 'scan'
  const [viewMode, setViewMode] = useState('dashboard');

  // UI States
  const [recentScans, setRecentScans] = useState([]);
  const [serverStatus, setServerStatus] = useState('checking'); // 'checking' | 'online' | 'offline'

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

  const steps = [
    { label: t('home.step1') },
    { label: t('home.step2') },
    { label: t('home.step3') },
  ];

  // Initialize
  useEffect(() => {
    checkServerHealth()
      .then(() => setServerStatus('online'))
      .catch(() => setServerStatus('offline'));
  }, []);

  // Initialize and Update Dashboard Data
  useEffect(() => {
    if (viewMode === 'dashboard') {
      // Refresh scan history whenever dashboard is active or scan completes
      const fetchHistory = async () => {
        const history = await Promise.resolve(getScanHistory(user?.id ?? null));
        setRecentScans(history.slice(0, 4));
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
          fetchWeather(3.1412, 101.6865);
          setLocationName('Malaysia');
        }

        // Now try to get real location in background
        const loc = await getLocation();
        if (loc) {
          // Update with real location if found
          fetchWeather(loc.lat, loc.lng);
        }
      };
      initData();
    }
  }, [viewMode]); // Keep location fetch separate to avoid re-fetching on scan updates

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

  const analysisStatusHint = useMemo(() => {
    if (!(loading && currentStep === 3)) return '';
    if (analysisElapsedMs > 30000) {
      return t('home.analysisSlowHint') || 'This is taking longer than usual. A weak connection can slow down image analysis.';
    }
    if (analysisElapsedMs > 15000) {
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

  // Handlers
  const handleStartScan = () => {
    setSearchParams({ scan: 'true' });
  };

  const handleMinimize = () => {
    setSearchParams({}); // Exits scan viewMode -> triggers 'dashboard' mode
    scanActions.showBackgroundNotification(); // Force the background notification since we manually minimized
  };

  const handleResetAndClose = () => {
    const exit = () => {
      scanActions.resetScan();
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
    if (currentStep === 1 && !selectedImage) {
      scanActions.setError(t('home.errorNoImage'));
      return;
    }
    if (currentStep === 2 && !selectedCategory) {
      scanActions.setError(t('home.errorNoCategory'));
      return;
    }

    scanActions.nextStep();

    if (currentStep === 2) {
      // Start Analysis
      try {
        const scanId = await scanActions.performAnalyze(location, locationName);
        // Only auto-navigate if the user is still actively looking at the scan overlay
        const currentSearch = new URLSearchParams(window.location.search);
        if (isMounted.current && scanId && currentSearch.get('scan') === 'true') {
          navigate(`/results/${scanId}`);
        }
      } catch (e) {
        // Error handled in hook, but we intercept it here to show as a modal if it's the non-plant error
        if (e.message === 'NOT_A_PLANT' || scanActions.error === t('home.errorNotPlant')) {
          setModalConfig({
            isOpen: true,
            title: t('common.error') || 'Error',
            message: t('home.errorNotPlant'),
            type: 'alert'
          });
          // Clear the inline error so it doesn't show at the bottom too
          scanActions.setError('');
        }
      }
    }
  };


  const handleLocationClick = () => {
    setLocationName(t('common.locating'));
    getLocation().then(loc => loc && fetchWeather(loc.lat, loc.lng));
  };

  const handleFeatureStub = (featureName) => {
    setModalConfig({
      isOpen: true,
      title: featureName || t('common.comingSoonTitle'),
      message: t('common.featureUnderDev'),
      type: 'alert'
    });
  };

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
        <div className="container">
          <HeroSection
            greeting={getGreeting()}
            locationName={locationName}
            isLocating={isLocating}
            onLocationClick={handleLocationClick}
            weatherTemp={weatherTemp}
            weatherIcon={weatherIcon}
            weatherError={weatherError}
          />

          <ActionGrid onScan={handleStartScan} />

          <ServerStatus status={serverStatus} />

          <RecentScans
            scans={recentScans}
            onSeeAll={() => navigate('/history')}
            onScanClick={(id) => navigate(`/results/${id}`)}
          />

          {/* Farming Notices â€” logged-in users only */}
          {user && forecast.length > 0 && (
            <FarmingNotices forecast={forecast} />
          )}

          <DailyTips />

          <ServicesGrid onNavigate={(path, isStub, external) => {
            if (isStub) {
              handleFeatureStub();
            } else if (external) {
              window.open(path, '_blank', 'noopener,noreferrer');
            } else {
              navigate(path);
            }
          }} />
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

      <div className="container">
        {(loading || currentStep === 3) ? (
          <div className="loading-overlay">
            <div className="loading-card">
              <div className="loading-spinner-circle"></div>

              <h2 className="loading-title">
                {analyzingStep === 0 && (t('home.stepProcessing') || t('home.stepSmart'))}
                {analyzingStep === 1 && t('onboarding.step2Title')}
                {analyzingStep === 2 && t('home.generating')}
              </h2>

              <div className="quote-box">
                <span className="quote-icon-left">"</span>
                <p className="quote-text">{currentPeribahasa}</p>
                <span className="quote-icon-right">"</span>
              </div>

              <div className="dots-indicator">
                <div className={`dot ${analyzingStep >= 0 ? 'active' : ''}`}></div>
                <div className={`dot ${analyzingStep >= 1 ? 'active' : ''}`}></div>
                <div className={`dot ${analyzingStep >= 2 ? 'active' : ''}`}></div>
              </div>

              {analysisStatusHint && (
                <div className="analysis-hint-banner">
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
        ) : (
          <>
            <div style={{ marginTop: '24px' }}>
              <ProgressStepper currentStep={currentStep} steps={steps} onStepClick={(step) => {
                if (step < currentStep) scanActions.setStep(step);
              }} />
            </div>

            {error && (
              <div className="error-banner bounce-in">
                <AlertCircle size={20} />
                <div className="error-banner-copy">
                  <span>{error}</span>
                  {errorSupportHint && <small>{errorSupportHint}</small>}
                </div>
                <button onClick={() => scanActions.setError('')} className="close-error" aria-label={t('common.close') || 'Close'}>×</button>
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
                      <h2 className="mb-xs">{t('home.step1Title')}</h2>
                      <p>{t('home.step1Desc')}</p>
                    </div>
                  </div>

                  {/* Main Image Upload */}
                  <div className="mb-lg">
                    <CameraUpload
                      onImageCapture={scanActions.handleImageCapture}
                      currentImage={selectedImage}
                    />
                  </div>

                  {/* Leaf Image Upload (Optional) */}
                  <div className="leaf-upload-card mb-lg fade-in-delayed">
                    <div className="leaf-card-header">
                      <div className="leaf-icon-circle">
                        <Leaf size={20} />
                      </div>
                      <div className="leaf-card-text">
                        <h3>{t('home.addLeafPhoto') || "Add Leaf Close-up (Optional)"}</h3>
                        <p>{t('home.leafDescription') || "For better accuracy, add a close-up photo of affected leaves"}</p>
                      </div>
                    </div>
                    <CameraUpload
                      onImageCapture={scanActions.handleLeafImageCapture}
                      currentImage={selectedLeafImage}
                    />
                  </div>

                  <div className="step-actions mt-xl">
                    <button className="btn btn-secondary" onClick={handleResetAndClose}>{t('common.cancel')}</button>
                    <button className="btn btn-primary" onClick={handleNextStep} disabled={!selectedImage}>{t('common.next')}</button>
                  </div>


                </div>
              )}

              {currentStep === 2 && (
                <div className="step-wrapper">
                  <div className="step-header mb-lg mt-xl">
                    <h2>{t('home.step2Title')}</h2>
                    <p>{t('home.step2Desc')}</p>
                  </div>
                  <PlantCategorySelector
                    selected={selectedCategory}
                    onSelect={scanActions.setCategory}
                  />

                  <div className="scale-selection-section mt-md">

                    <FarmScaleSelector
                      selected={selectedScale}
                      onSelect={scanActions.setScale}
                      quantity={scaleQuantity}
                      onQuantityChange={scanActions.setQuantity}
                      selectedCategory={selectedCategory}
                    />
                  </div>

                  <div className="step-actions">
                    <button className="btn btn-secondary" onClick={scanActions.prevStep}>{t('common.back')}</button>
                    <button className="btn btn-primary" onClick={handleNextStep}>{t('home.analyzeButton')}</button>
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

