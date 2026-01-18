import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { useScanLogic } from '../hooks/useScanLogic';

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
  const [searchParams, setSearchParams] = useSearchParams();

  // Custom Hooks
  const { getGreeting } = useGreeting();
  const { location, locationName, isLocating, getLocation, setLocationName } = useLocation();
  const { weatherTemp, weatherIcon, fetchWeather } = useWeather();
  const { state: scanState, actions: scanActions } = useScanLogic();

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

  // Initialize Dashboard Data
  useEffect(() => {
    if (viewMode === 'dashboard') {
      const history = getScanHistory();
      setRecentScans(history.slice(0, 4));

      const initData = async () => {
        const loc = await getLocation();
        if (loc) {
          fetchWeather(loc.lat, loc.lng);
        }
      };
      initData();
    }
  }, [viewMode, getLocation, fetchWeather]);

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
    scanActions.setStep(1);
  };

  const handleResetAndClose = () => {
    setModalConfig({
      isOpen: true,
      title: t('home.confirmExit'),
      message: t('home.confirmExitMessage') || 'Anda akan kehilangan kemajuan imbasan semasa.',
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
        if (scanId) navigate(`/results/${scanId}`);
      } catch (e) {
        // Error handled in hook
      }
    }
  };

  const handleQuickScan = async () => {
    if (!selectedImage) {
      scanActions.setError(t('home.errorNoImage'));
      return;
    }
    if (!selectedCategory) {
      scanActions.setCategory('Vegetables');
    }
    scanActions.setStep(3);
    try {
      const scanId = await scanActions.performAnalyze(location, locationName);
      if (scanId) navigate(`/results/${scanId}`);
    } catch (e) {
      // Error handled in hook
    }
  };

  const handleLocationClick = () => {
    setLocationName('Locating...');
    getLocation().then(loc => loc && fetchWeather(loc.lat, loc.lng));
  };

  const handleFeatureStub = (featureName) => {
    setModalConfig({
      isOpen: true,
      title: featureName || "Coming Soon",
      message: t('common.comingSoon') || "This feature is currently under development.",
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
        {loading ? (
          <div className="scanning-overlay">
            <div className="pulse-ring"></div>
            <div className="scanning-content">
              <div className="scanning-icon-wrapper"><ScanLine size={48} className="scanning-icon-animate" /></div>
              <h2>{t('home.analyzing')}</h2>
              <p className="analyzing-step-text">
                {analyzingStep === 0 && t('home.stepProcessing')}
                {analyzingStep === 1 && t('home.stepAI')}
                {analyzingStep === 2 && t('home.stepFinalizing')}
              </p>
              <div className="analysis-progress-bar"><div className="analysis-progress-fill" style={{ width: `${((analyzingStep + 1) / 3) * 100}%` }}></div></div>
              <div className="peribahasa-container fade-in-slow">
                <p className="peribahasa-text">"{currentPeribahasa}"</p>
                <span className="peribahasa-label">{t('home.didYouKnow')}</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <ProgressStepper currentStep={currentStep} steps={steps} onStepClick={(step) => {
              if (step < currentStep) scanActions.setStep(step);
            }} />

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
                  <div className="step-header mb-lg mt-md">
                    <h2>{t('home.step1Title')}</h2>
                    <p>{t('home.step1Desc')}</p>
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

                  <style>{`
                    .leaf-upload-card {
                      background: white;
                      border-radius: var(--radius-lg);
                      padding: 24px;
                      box-shadow: var(--shadow-md);
                      border: 1px solid var(--color-border-light);
                    }

                    .leaf-card-header {
                      display: flex;
                      align-items: flex-start;
                      gap: 16px;
                      margin-bottom: 20px;
                    }

                    .leaf-icon-circle {
                      width: 40px;
                      height: 40px;
                      border-radius: 50%;
                      background: var(--color-primary-light);
                      color: var(--color-primary);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      flex-shrink: 0;
                    }

                    .leaf-card-text h3 {
                      font-size: 1.1rem;
                      margin: 0 0 4px 0;
                      color: var(--color-text-primary);
                    }

                    .leaf-card-text p {
                      font-size: 0.9rem;
                      margin: 0;
                      color: var(--color-text-secondary);
                      line-height: 1.4;
                    }

                    .fade-in-delayed {
                      animation: fadeIn 0.6s ease;
                    }
                  `}</style>
                </div>
              )}

              {currentStep === 2 && (
                <div className="step-wrapper">
                  <div className="step-header">
                    <h2>{t('home.step2Title')}</h2>
                    <p>{t('home.step2Desc')}</p>
                  </div>
                  <PlantCategorySelector
                    selectedCategory={selectedCategory}
                    onSelect={scanActions.setCategory}
                  />

                  <div className="scale-selection-section mt-md">
                    <h3>{t('home.scaleTitle')}</h3>
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

                  {selectedImage && selectedCategory && (
                    <div className="quick-scan-prompt mt-md">
                      <button className="btn btn-text" onClick={handleQuickScan}>
                        <ScanLine size={16} /> {t('home.quickScan')}
                      </button>
                    </div>
                  )}
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
