import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation as useRouterLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import {
  ScanLine, AlertCircle, Leaf
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

// UI Components
import HeroSection from '../components/home/HeroSection';
import ServerStatus from '../components/home/ServerStatus';
import ActionGrid from '../components/home/ActionGrid';
import RecentScans from '../components/home/RecentScans';
import DailyTips from '../components/home/DailyTips';
import ServicesGrid from '../components/home/ServicesGrid';

const Home = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Custom Hooks
  const { getGreeting } = useGreeting();
  const { location, locationName, isLocating, getLocation, setLocationName } = useLocation();
  const { weatherTemp, weatherIcon, fetchWeather } = useWeather();
  const { state: scanState, actions: scanActions } = useScanContext();
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

  // Force dashboard view whenever location changes (e.g. clicking Home nav)
  useEffect(() => {
    setViewMode('dashboard');
  }, [routerLocation]); // This fixes the "stuck on scan" issue when clicking Home

  // No auto-reset on mount needed - allows background scanning to continue.
  // If scan is running, ScanContext handles it and NotificationToast shows status.
  // User sees Dashboard by default.

  const {
    selectedImage, selectedLeafImage, selectedCategory, selectedScale, scaleQuantity,
    currentStep, loading, error, analyzingStep
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
      const history = getScanHistory();
      setRecentScans(history.slice(0, 4));
    }
  }, [viewMode, loading]); // Added loading to auto-refresh history after background scan

  // Initial Location & Weather
  useEffect(() => {
    if (viewMode === 'dashboard' && !locationName) {
      const initData = async () => {
        const loc = await getLocation();
        if (loc) {
          fetchWeather(loc.lat, loc.lng);
        }
      };
      initData();
    }
  }, [viewMode]); // Keep location fetch separate to avoid re-fetching on scan updates

  // Check URL params for scan trigger
  useEffect(() => {
    if (searchParams.get('scan') === 'true') {
      setViewMode('scan');
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

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

  // Handlers
  const handleStartScan = () => {
    setViewMode('scan');
    // Only reset to step 1 if we aren't currently analyzing a scan
    if (!scanState.loading) {
      scanActions.setStep(1);
    }
  };

  const handleResetAndClose = () => {
    setModalConfig({
      isOpen: true,
      title: t('home.confirmExit'),
      message: t('home.confirmExitMessage'),
      type: 'confirm',
      confirmText: t('common.exit'),
      cancelText: t('common.continueScan'),
      onConfirm: () => {
        scanActions.resetScan();
        setViewMode('dashboard');
      }
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
        if (isMounted.current && scanId) navigate(`/results/${scanId}`);
      } catch (e) {
        // Error handled in hook
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
            language={language}
          />

          <ActionGrid onScan={handleStartScan} />

          <ServerStatus status={serverStatus} />

          <RecentScans
            scans={recentScans}
            onSeeAll={() => navigate('/history')}
            onScanClick={(id) => navigate(`/results/${id}`)}
          />

          <DailyTips />

          <ServicesGrid onNavigate={(path) => {
            if (path === '/shop') handleFeatureStub(t('home.shop'));
            else if (path === '/statistics') handleFeatureStub(t('home.statistics'));
            else if (path === '/key-info') navigate('/guide');
            else if (path === '/user-guide') navigate('/onboarding');
            else navigate(path);
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

              <button
                onClick={handleResetAndClose}
                style={{
                  marginTop: '24px',
                  background: 'none',
                  border: '1px solid #D1D5DB',
                  borderRadius: '9999px',
                  padding: '8px 24px',
                  color: '#6B7280',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#9CA3AF';
                  e.currentTarget.style.color = '#374151';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.color = '#6B7280';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span style={{ fontSize: '1.2em', lineHeight: '1' }}>×</span> {t('common.cancel')}
              </button>
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
                <span>{error}</span>
                <button onClick={() => scanActions.setError('')} className="close-error">×</button>
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
