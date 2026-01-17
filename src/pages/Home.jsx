import { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { Camera, ShoppingBag, BookOpen, Clock, Droplets, Globe, Bug, FlaskConical, CloudSun, MapPin, Sun, CloudRain, Snowflake, CloudLightning, CheckCircle, AlertTriangle, Leaf, Sprout, ScanLine, AlertCircle, Info, Wifi, WifiOff } from 'lucide-react';
import { imageToBase64, analyzePlantDisease, checkServerHealth } from '../utils/diseaseDetection';
import { saveScan, getScanHistory } from '../utils/localStorage';
import CameraUpload from '../components/CameraUpload';
import PlantCategorySelector from '../components/PlantCategorySelector';
import FarmScaleSelector from '../components/FarmScaleSelector';
import ProgressStepper from '../components/ProgressStepper';
import { getRandomPeribahasa, getRandomPeribahasaList } from '../utils/peribahasa';
import CustomModal from '../components/CustomModal';

// Scan state reducer
const scanReducer = (state, action) => {
  switch (action.type) {
    case 'SET_IMAGE':
      return { ...state, selectedImage: action.payload, error: '' };
    case 'SET_LEAF_IMAGE':
      return { ...state, selectedLeafImage: action.payload, error: '' };
    case 'SET_CATEGORY':
      return { ...state, selectedCategory: action.payload, error: '' };
    case 'SET_SCALE':
      return { ...state, selectedScale: action.payload };
    case 'SET_QUANTITY':
      return { ...state, scaleQuantity: action.payload };
    case 'NEXT_STEP':
      return { ...state, currentStep: state.currentStep + 1, error: '' };
    case 'PREV_STEP':
      return { ...state, currentStep: state.currentStep - 1, error: '' };
    case 'SET_STEP':
      return { ...state, currentStep: action.payload, error: '' };
    case 'START_ANALYSIS':
      return { ...state, loading: true, error: '', analyzingStep: 0 };
    case 'UPDATE_ANALYZING_STEP':
      return { ...state, analyzingStep: action.payload };
    case 'COMPLETE_ANALYSIS':
      return { ...state, loading: false, analyzingStep: 0 };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'RESET_SCAN':
      return { ...initialScanState };
    default:
      return state;
  }
};

const initialScanState = {
  selectedImage: null,
  selectedLeafImage: null,
  selectedCategory: '',
  selectedScale: 'personal',
  scaleQuantity: 1,
  currentStep: 1,
  loading: false,
  error: '',
  analyzingStep: 0
};

const Home = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Scan flow state (consolidated with useReducer)
  const [scanState, dispatch] = useReducer(scanReducer, initialScanState);
  const { selectedImage, selectedLeafImage, selectedCategory, selectedScale, scaleQuantity, currentStep, loading, error, analyzingStep } = scanState;

  // View State: 'dashboard' | 'scan'
  const [viewMode, setViewMode] = useState('dashboard');

  // UI states (keep separate - set once, rarely updated)
  const [userLocationName, setUserLocationName] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [weatherTemp, setWeatherTemp] = useState(null);
  const [weatherIcon, setWeatherIcon] = useState('⛅');
  const [currentPeribahasa, setCurrentPeribahasa] = useState('');
  const [peribahsaList, setPeribahsaList] = useState([]);
  const [currentPeribahasaIndex, setCurrentPeribahasaIndex] = useState(0);

  // Recent Scans State
  const [recentScans, setRecentScans] = useState([]);

  // Modal state
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
    onConfirm: null
  });

  // Server Status State
  const [serverStatus, setServerStatus] = useState('checking'); // 'checking' | 'online' | 'offline'

  // Check server health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        await checkServerHealth();
        setServerStatus('online');
      } catch (error) {
        console.warn('Server offline, enabling demo mode');
        setServerStatus('offline');
      }
    };
    checkHealth();
  }, []);



  // Helper to get current location
  const getLocation = useCallback(() => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          if (error.code !== 1) {
            console.warn('Geolocation error:', error);
          }
          resolve(null);
        },
        { timeout: 15000, enableHighAccuracy: false }
      );
    });
  }, []);

  // Initialize dashboard data
  const fetchDashboardData = useCallback(async () => {
    setIsLocating(true);
    const loc = await getLocation();

    if (loc) {
      try {
        // Fetch Location Name
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}`);
        const geoData = await geoRes.json();
        const city = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.district || geoData.address.state || 'Unknown Location';
        setUserLocationName(city);

        // Fetch Weather
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&current_weather=true`);
        const weatherData = await weatherRes.json();
        const current = weatherData.current_weather;

        if (current) {
          setWeatherTemp(Math.round(current.temperature));
          const code = current.weathercode;
          if (code === 0) setWeatherIcon('sun');
          else if (code <= 3) setWeatherIcon('cloud-sun');
          else if (code <= 69) setWeatherIcon('cloud-rain');
          else if (code <= 79) setWeatherIcon('snowflake');
          else if (code <= 99) setWeatherIcon('cloud-lightning');
        }
      } catch (e) {
        console.error("Data fetch failed", e);
        setUserLocationName('Unknown Location');
      }
    } else {
      // Fallback location + default weather
      try {
        setUserLocationName('Malaysia');
        setWeatherTemp(30);
      } catch (e) {
        console.error("Fallback location failed", e);
        setUserLocationName('Location N/A');
      }
    }
    setIsLocating(false);
  }, [getLocation]);

  // Check for scan parameter in URL and auto-open scan flow
  useEffect(() => {
    const shouldScan = searchParams.get('scan');
    if (shouldScan === 'true') {
      setViewMode('scan');
      // Clear the parameter after handling
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (viewMode === 'dashboard') {
      // Load recent scans
      const history = getScanHistory();
      setRecentScans(history.slice(0, 4));

      fetchDashboardData();
    }
  }, [viewMode, fetchDashboardData]);

  // Tips Carousel State
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const touchStart = useRef(null);
  const touchEnd = useRef(null);

  const dailyTips = [
    { id: 1, titleKey: 'tip1Title', descKey: 'tip1Desc', icon: <Droplets size={36} />, bg: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)', color: '#1565C0' },
    { id: 2, titleKey: 'tip2Title', descKey: 'tip2Desc', icon: <FlaskConical size={36} />, bg: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)', color: '#2E7D32' },
    { id: 3, titleKey: 'tip3Title', descKey: 'tip3Desc', icon: <Bug size={36} />, bg: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)', color: '#EF6C00' },
    { id: 4, titleKey: 'tip4Title', descKey: 'tip4Desc', icon: <Sprout size={36} />, bg: 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)', color: '#6A1B9A' }
  ];

  const handleTouchStart = (e) => {
    touchStart.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      setCurrentTipIndex((prev) => (prev + 1) % dailyTips.length);
    } else if (isRightSwipe) {
      setCurrentTipIndex((prev) => (prev - 1 + dailyTips.length) % dailyTips.length);
    }

    touchEnd.current = null;
    touchStart.current = null;
  };

  // Auto-play tips carousel every 3 seconds
  useEffect(() => {
    if (viewMode === 'dashboard') {
      const interval = setInterval(() => {
        setCurrentTipIndex((prev) => (prev + 1) % dailyTips.length);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [viewMode, dailyTips.length]);

  // Rotate peribahasa every 3 seconds during analysis
  useEffect(() => {
    if (loading && currentStep === 3 && peribahsaList.length > 1) {
      const interval = setInterval(() => {
        setCurrentPeribahasaIndex((prev) => {
          const nextIndex = (prev + 1) % peribahsaList.length;
          setCurrentPeribahasa(peribahsaList[nextIndex]);
          return nextIndex;
        });
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [loading, currentStep, peribahsaList]);

  const steps = [
    { label: t('home.step1') },
    { label: t('home.step2') },
    { label: t('home.step3') },
  ];

  // Helper to get time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.greetingMorning') || 'Good Morning';
    if (hour < 18) return t('home.greetingAfternoon') || 'Good Afternoon';
    return t('home.greetingEvening') || 'Good Evening';
  };

  const handleStartScan = () => {
    setViewMode('scan');
    dispatch({ type: 'SET_STEP', payload: 1 });
  };

  const handleResetAndClose = () => {
    // Show custom confirmation before closing
    setModalConfig({
      isOpen: true,
      title: t('home.confirmExit'),
      message: t('home.confirmExitMessage') || 'Anda akan kehilangan kemajuan imbasan semasa.',
      type: 'confirm',
      confirmText: t('common.exit'),
      cancelText: t('common.continueScan'),
      onConfirm: () => {
        handleReset();
        setViewMode('dashboard');
      }
    });
  };

  const handleImageCapture = (file) => {
    dispatch({ type: 'SET_IMAGE', payload: file });
  };

  const handleLeafImageCapture = (file) => {
    dispatch({ type: 'SET_LEAF_IMAGE', payload: file });
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !selectedImage) {
      dispatch({ type: 'SET_ERROR', payload: t('home.errorNoImage') });
      return;
    }

    if (currentStep === 2 && !selectedCategory) {
      dispatch({ type: 'SET_ERROR', payload: t('home.errorNoCategory') });
      return;
    }

    dispatch({ type: 'NEXT_STEP' });

    if (currentStep === 2) {
      handleAnalyze();
    }
  };

  const handlePrevStep = () => {
    dispatch({ type: 'PREV_STEP' });
  };

  const handleQuickScan = async () => {
    if (!selectedImage) {
      dispatch({ type: 'SET_ERROR', payload: t('home.errorNoImage') });
      return;
    }
    if (!selectedCategory) {
      dispatch({ type: 'SET_CATEGORY', payload: 'Vegetables' });
    }
    dispatch({ type: 'SET_STEP', payload: 3 });
    await handleAnalyze();
  };

  const handleReset = () => {
    dispatch({ type: 'RESET_SCAN' });
  };

  const handleAnalyze = async () => {
    dispatch({ type: 'START_ANALYSIS' });

    // Start fetching location immediately
    const locationPromise = getLocation();

    // Set up rotating peribahasa for the analyzing screen
    const peribahasaList = getRandomPeribahasaList(language, 5); // Get 5 random peribahasa
    setPeribahsaList(peribahasaList);
    setCurrentPeribahasaIndex(0);
    setCurrentPeribahasa(peribahasaList[0] || getRandomPeribahasa(language));

    const performStep = (stepIndex, duration) => {
      return new Promise(resolve => {
        dispatch({ type: 'UPDATE_ANALYZING_STEP', payload: stepIndex });
        setTimeout(resolve, duration);
      });
    };

    try {
      await performStep(0, 1500);
      const treeImageBase64 = await imageToBase64(selectedImage);
      const leafImageBase64 = selectedLeafImage ? await imageToBase64(selectedLeafImage) : null;

      await performStep(1, 2000);
      const result = await analyzePlantDisease(
        treeImageBase64,
        selectedCategory || 'Vegetables',
        leafImageBase64,
        language
      );

      await performStep(2, 1000);

      // Wait for location if checking hasn't finished
      const location = await locationPromise;
      let locationName = '';

      if (location) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`);
          const data = await res.json();

          // Collect detailed location info
          const address = data.address;
          const locationParts = [
            address.suburb || address.neighbourhood,
            address.city || address.town || address.village,
            address.district,
            address.state
          ].filter(Boolean); // Remove empty values

          locationName = locationParts.join(', ');
        } catch (e) {
          console.error("Geocoding failed", e);
        }
      }

      // Create thumbnails for local storage (Max 400px to save space)
      const treeImageThumbnail = await imageToBase64(selectedImage, 400);
      const leafImageThumbnail = selectedLeafImage ? await imageToBase64(selectedLeafImage, 400) : null;

      const savedScan = saveScan({
        image: treeImageThumbnail, // Save thumbnail, not full res
        leafImage: leafImageThumbnail,
        disease: result.disease,
        fungusType: result.fungusType,
        pathogenType: result.pathogenType,
        estimatedAge: result.estimatedAge,
        confidence: result.confidence,
        severity: result.severity,
        plantPart: result.plantPart,
        symptoms: result.symptoms,
        immediateActions: result.immediateActions,
        treatments: result.treatments,
        prevention: result.prevention,
        additionalNotes: result.additionalNotes,
        plantType: result.plantType || selectedCategory,
        category: selectedCategory || 'Vegetables',
        healthStatus: result.healthStatus || 'Unknown',
        nutritionalIssues: result.nutritionalIssues || null,
        fertilizerRecommendations: result.fertilizerRecommendations || [],
        productRecommendations: result.productRecommendations || [],
        healthyCarePlan: result.healthyCarePlan || null,
        farmScale: selectedScale,
        scaleQuantity: scaleQuantity,
        location: location,
        locationName: locationName
      });

      navigate(`/results/${savedScan.id}`);

    } catch (err) {
      console.error('Analysis error:', err);
      dispatch({ type: 'SET_ERROR', payload: err.message || t('home.errorAnalysis') });
      dispatch({ type: 'SET_STEP', payload: 2 });
    } finally {
      dispatch({ type: 'COMPLETE_ANALYSIS' });
    }
  };

  // Helper to render weather icon
  const renderWeatherIcon = () => {
    switch (weatherIcon) {
      case 'sun': return <Sun size={24} color="#FDB813" />;
      case 'cloud-sun': return <CloudSun size={24} color="#FDB813" />;
      case 'cloud-rain': return <CloudRain size={24} color="#4A90E2" />;
      case 'snowflake': return <Snowflake size={24} color="#A0C4FF" />;
      case 'cloud-lightning': return <CloudLightning size={24} color="#7C4DFF" />;
      default: return <CloudSun size={24} color="#FDB813" />;
    }
  };

  if (viewMode === 'dashboard') {
    return (
      <div className="dashboard page fade-in">
        <div className="container">
          {/* Greeting Section */}
          <div className="dashboard-header">
            <div>
              <h1 className="greeting">{getGreeting()}, Farmer!</h1>
              <p className="date-display">
                <>
                  <span
                    style={{ color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => {
                      setUserLocationName('Locating...');
                      fetchDashboardData();
                    }}
                  >
                    <MapPin size={16} /> {userLocationName || (isLocating ? 'Locating...' : 'Set Location')} <Clock size={16} />
                  </span>
                  <br />
                </>
                {new Date().toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="weather-widget">
              <span className="weather-icon">{renderWeatherIcon()}</span>
              <span className="weather-temp">{weatherTemp ? `${weatherTemp}°C` : '--°C'}</span>
            </div>
          </div>

          <div className="main-action-grid">
            <button
              onClick={handleStartScan}
              className="action-tile primary-tile bounce-in"
            >
              <div className="tile-icon">
                <ScanLine size={32} />
              </div>
              <div className="tile-text">
                <span className="tile-label">{t('home.scanPlant')}</span>
                <span className="tile-sublabel">{t('home.scanDesc')}</span>
              </div>
            </button>
          </div>

          {/* Server Status Banner - Compact */}
          <div className="server-status-minimal mt-sm fade-in">
            <div className={`status-dot ${serverStatus === 'offline' ? 'bg-orange' : 'bg-green'}`}></div>
            <span className="status-text-minimal">
              {serverStatus === 'offline' ? t('home.demoMode') : t('home.onlineStatus')}
            </span>
          </div>

          {/* Recent Activity Section - Moved Up */}
          <div className="section mt-md slide-up">
            <div className="section-header">
              <h3 className="section-title">{t('home.recentScans')}</h3>
              <button onClick={() => navigate('/history')} className="see-all-btn">{t('home.seeAll')}</button>
            </div>
            <div className="recent-scans-list">
              {recentScans.length > 0 ? (
                recentScans.map((scan) => (
                  <div key={scan.id} className="scan-card" onClick={() => navigate(`/results/${scan.id}`)}>
                    <div className="scan-thumbnail">
                      <img src={scan.image} alt={scan.disease} />
                    </div>
                    <div className="scan-details">
                      <h4 className="scan-disease">
                        {(() => {
                          // Clean up and parse the disease string
                          const raw = scan.disease || '';
                          // Split by comma or ampersand
                          const parts = raw.split(/[&,]/).map(s => s.trim()).filter(Boolean);

                          if (parts.length > 1) {
                            return (
                              <span>
                                {parts[0]} <span style={{ fontSize: '0.8em', color: 'var(--color-primary)', fontWeight: '500' }}>+{parts.length - 1}</span>
                              </span>
                            );
                          }
                          return raw;
                        })()}
                      </h4>
                      <p className="scan-meta">
                        {scan.plantType} • {new Date(scan.timestamp).toLocaleDateString()}
                      </p>
                      {scan.locationName && (
                        <p className="scan-location">
                          <MapPin size={12} /> {scan.locationName}
                        </p>
                      )}
                      <div className={`scan-status-info status-${scan.healthStatus?.toLowerCase()}`}>
                        <span className="status-icon">
                          {scan.healthStatus?.toLowerCase() === 'healthy' ?
                            <CheckCircle size={14} className="text-green-600" /> :
                            <AlertTriangle size={14} className="text-red-500" />
                          }
                        </span>
                        <span className="status-text">{scan.healthStatus}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state-card">
                  <span>{t('home.noRecentScans')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tips Carousel Section - Moved Up */}
          <div className="section mt-md tips-section slide-up delay-200">
            <div className="section-header">
              <h3 className="section-title">{t('home.dailyTips')}</h3>
            </div>

            <div
              className="tips-carousel-container"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div
                key={currentTipIndex}
                className="tips-card fade-in-fast"
                style={{ background: dailyTips[currentTipIndex].bg, position: 'relative' }}
              >
                <div className="tip-content">
                  <span
                    className="tip-badge"
                    style={{ color: dailyTips[currentTipIndex].color }}
                  >
                    {t('home.tipBadge')}
                  </span>
                  <h4 style={{ color: dailyTips[currentTipIndex].color }}>{t(`home.${dailyTips[currentTipIndex].titleKey}`)}</h4>
                  <p style={{ color: dailyTips[currentTipIndex].color }}>{t(`home.${dailyTips[currentTipIndex].descKey}`)}</p>
                </div>
                <div className="tip-image">{dailyTips[currentTipIndex].icon}</div>

                {/* Dots Indicator */}
                <div className="dots-container">
                  {dailyTips.map((_, idx) => (
                    <div
                      key={idx}
                      className={`carousel-dot ${idx === currentTipIndex ? 'active' : ''}`}
                      onClick={() => setCurrentTipIndex(idx)}
                      style={{
                        backgroundColor: idx === currentTipIndex ? dailyTips[currentTipIndex].color : 'rgba(0,0,0,0.1)'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Grid for Secondary Actions & Shop - Moved Bottom */}
          {/* Grid for Secondary Actions & Shop - Moved Bottom (Grab Style) */}
          <div className="services-grid mt-md">
            <button onClick={() => setModalConfig({
              isOpen: true,
              title: t('home.shop'),
              message: t('common.comingSoon'),
              type: 'alert'
            })} className="action-tile secondary-tile bounce-in delay-100 shop-tile">
              <div className="tile-icon"><ShoppingBag size={28} /></div>
              <span className="tile-label">{t('home.shop')}</span>
            </button>
            <button onClick={() => navigate('/guide')} className="action-tile secondary-tile bounce-in delay-200">
              <div className="tile-icon"><Info size={28} /></div>
              <span className="tile-label">{language === 'ms' ? 'Info Utama' : 'Key Info'}</span>
            </button>
            <button onClick={() => navigate('/onboarding')} className="action-tile secondary-tile bounce-in delay-300 guide-tile">
              <div className="tile-icon"><BookOpen size={28} /></div>
              <span className="tile-label">{t('home.userGuide')}</span>
            </button>
          </div>

        </div>

        <style>{`
            .recent-scans-list {
              display: flex;
              flex-direction: column;
              gap: var(--space-md);
            }

            .scan-card {
              display: flex;
              align-items: center;
              background: white;
              padding: var(--space-sm);
              border-radius: var(--radius-lg);
              box-shadow: var(--shadow-sm);
              border: 1px solid var(--color-border);
              transition: all 0.2s ease;
              cursor: pointer;
            }

            .scan-card:active {
                transform: scale(0.98);
            }

            .scan-thumbnail {
              width: 60px;
              height: 60px;
              border-radius: var(--radius-md);
              overflow: hidden;
              margin-right: var(--space-md);
              flex-shrink: 0;
            }

            .scan-thumbnail img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .scan-details {
              flex: 1;
              min-width: 0;
            }

            .scan-disease {
              font-size: var(--font-size-base);
              font-weight: 600;
              margin: 0 0 4px 0;
              color: var(--color-text-primary);
              /* Enforce 2 lines max with ellipsis for consistency */
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
              min-height: 2.8em; /* Approximate height for 2 lines to ensure alignment */
            }

            .scan-meta {
              font-size: var(--font-size-xs);
              color: var(--color-text-secondary);
              margin: 0;
            }

            .scan-location {
              font-size: var(--font-size-xs);
              color: var(--color-text-secondary);
              margin: 4px 0 0 0;
              display: flex;
              align-items: center;
              gap: 4px;
              font-style: italic;
            }

            .scan-status-info {
              display: flex;
              align-items: center;
              gap: 6px;
              margin-top: 8px;
              font-size: var(--font-size-sm);
              font-weight: 500;
            }

            .status-healthy { color: var(--color-primary); }
            .status-at-risk, .status-warning { color: #EAB308; }
            .status-unhealthy, .status-danger { color: #EF4444; }

            .server-status-minimal {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 4px 10px;
              background: rgba(255, 255, 255, 0.5);
              border-radius: 20px;
              font-size: 0.75rem;
              font-weight: 600;
              margin: 0 auto; /* Center it */
              width: fit-content;
            }

            .status-dot {
              width: 8px;
              height: 8px;
              border-radius: 50%;
            }

            .bg-green { background-color: #10B981; box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2); }
            .bg-orange { background-color: #F59E0B; box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2); }

            .status-text-minimal {
              color: var(--color-text-secondary);
              letter-spacing: 0.5px;
              text-transform: uppercase;
              font-size: 0.7rem;
            }
          `}</style>

        <style>{`
                  .dashboard {
                      background-color: var(--color-bg-secondary);
                      min-height: 100vh;
                      padding-bottom: 0 !important; /* Override global .page padding */
                  }

                  .section {
                      padding: var(--space-md) 0; /* Standardized closer spacing */
                  }

                  .tips-section {
                      padding-top: 0; /* Tighten up the tips area specifically */
                  }
                  
                  .container {
                      max-width: 600px;
                      margin: 0 auto;
                      padding: 0 var(--space-md) var(--space-xl) var(--space-md); /* Adjusted bottom padding */
                      overflow: hidden; /* Prevent container scroll */
                  }

                  @media (min-width: 1024px) {
                      .container {
                          max-width: 1000px;
                      }
                      
                      .main-action-grid {
                          grid-template-columns: 2fr 1fr 1fr 1fr !important;
                          gap: var(--space-lg) !important;
                      }
                      
                      .primary-tile {
                          grid-column: span 1 !important;
                          height: 100%;
                      }
                      
                      .recent-scans-list {
                          display: grid !important;
                          grid-template-columns: repeat(4, 1fr); /* Changed from 3 to 4 */
                          gap: var(--space-md) !important; /* Slightly smaller gap to fit 4 */
                      }
                      
                      .scan-card {
                          flex-direction: column;
                          align-items: flex-start;
                          text-align: left;
                          height: 100%;
                      }
                      
                      .scan-thumbnail {
                          width: 100% !important;
                          height: 150px !important;
                          margin-right: 0 !important;
                          margin-bottom: var(--space-md);
                      }

                      .services-grid {
                          grid-template-columns: repeat(6, 1fr) !important; /* Even wider on desktop */
                          gap: var(--space-lg) !important;
                      }
                  }

                  .diseases-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(100%, 1fr));
            gap: 20px;
                  }

                  .services-grid {
                      display: grid;
                      grid-template-columns: repeat(4, 1fr); /* 4 columns */
                      gap: var(--space-md);
                  }

                  .shop-tile, .guide-tile {
                      grid-column: span 2; /* Each takes 2 of 4 columns */
                  }

                  .dashboard-header {
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      margin-bottom: var(--space-xl);
                      padding-top: var(--space-sm);
                  }
                  
                  .greeting {
                      font-size: var(--font-size-xl);
                      font-weight: 700;
                      color: var(--color-text-primary);
                      margin: 0;
                  }
                  
                  .date-display {
                      font-size: var(--font-size-sm);
                      color: var(--color-text-secondary);
                      margin: 0;
                  }
                  
                  .weather-widget {
                      background: white;
                      padding: 8px 12px;
                      border-radius: 20px;
                      box-shadow: var(--shadow-sm);
                      display: flex;
                      align-items: center;
                      gap: 8px;
                      font-weight: 600;
                      color: var(--color-text-primary);
                  }

                  .main-action-grid {
                      display: grid;
                      grid-template-columns: 1fr 1fr;
                      gap: var(--space-md);
                  }
                  
                  .hide-mobile {
                      display: none !important;
                  }

                  .shop-tile, .guide-tile {
                      grid-column: span 2;
                  }
                  
                  @media (min-width: 768px) {
                      .shop-tile, .guide-tile {
                          grid-column: span 1;
                      }
                  }
                  
                  /* First item spans 2 columns */
                  .primary-tile {
                      grid-column: span 2;
                      background: var(--color-primary);
                      color: white;
                      display: flex;
                      flex-direction: row; /* Horizontal layout for big button */
                      align-items: center;
                      justify-content: flex-start;
                      padding: var(--space-lg);
                      border-radius: var(--radius-lg);
                      border: none;
                      box-shadow: var(--shadow-md);
                      transition: transform 0.2s;
                      cursor: pointer;
                  }
                  
                  .primary-tile .tile-icon {
                      font-size: 2.5rem;
                      margin-right: var(--space-md);
                      background: rgba(255,255,255,0.2);
                      width: 60px;
                      height: 60px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      border-radius: 50%;
                  }

                  .primary-tile .tile-label {
                      font-size: var(--font-size-xl);
                      font-weight: 700;
                      display: block;
                  }
                  
                  .primary-tile .tile-sublabel {
                      font-size: var(--font-size-sm);
                      opacity: 0.9;
                      font-weight: 400;
                      display: block;
                  }

                  .secondary-tile {
                      background: white;
                      border: 1px solid rgba(0,0,0,0.05);
                      border-radius: var(--radius-lg);
                      padding: var(--space-md);
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: center;
                      aspect-ratio: 1; /* Square */
                      box-shadow: var(--shadow-sm);
                      transition: transform 0.2s;
                      cursor: pointer;
                  }
                  
                  .secondary-tile:active, .primary-tile:active {
                      transform: scale(0.96);
                  }

                  .secondary-tile .tile-icon {
                      font-size: 2rem;
                      margin-bottom: var(--space-xs);
                  }
                  
                  .secondary-tile .tile-label {
                      font-size: var(--font-size-sm);
                      font-weight: 600;
                      color: var(--color-text-primary);
                  }
                  
                  .section-header {
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      margin-bottom: var(--space-md);
                  }
                  
                  .section-title {
                      font-size: var(--font-size-lg);
                      font-weight: 700;
                      color: var(--color-text-primary);
                      margin: 0;
                  }
                  
                  .see-all-btn {
                      color: var(--color-primary);
                      background: none;
                      border: none;
                      font-weight: 600;
                      font-size: var(--font-size-sm);
                      cursor: pointer;
                  }
                  
                  .empty-state-card {
                      background: white;
                      padding: var(--space-lg);
                      border-radius: var(--radius-md);
                      text-align: center;
                      color: var(--color-text-secondary);
                      border: 1px dashed var(--color-border);
                      font-size: var(--font-size-sm);
                  }

                  .tips-card {
                      border-radius: var(--radius-lg);
                      padding: 24px;
                      padding-bottom: 48px; /* Room for dots */
                      display: flex;
                      align-items: center; /* Better vertical balance */
                      justify-content: space-between;
                      gap: var(--space-md);
                      min-height: 160px;
                      transition: all 0.3s ease;
                      cursor: pointer;
                  }

                  .dots-container {
                      position: absolute;
                      bottom: 16px;
                      left: 0;
                      right: 0;
                      display: flex;
                      justify-content: center;
                      gap: 8px;
                  }

                  .carousel-dot {
                      width: 8px;
                      height: 8px;
                      border-radius: 50%;
                      transition: all 0.3s ease;
                      cursor: pointer;
                  }

                  .carousel-dot.active {
                      transform: scale(1.2);
                      width: 20px; /* Pill shape for active */
                      border-radius: 10px;
                  }

                  .fade-in-fast {
                      animation: fadeIn 0.3s ease-in-out;
                  }
                  
                  .tip-content {
                      flex: 1;
                  }
                  
                  .tip-content h4 {
                      font-size: var(--font-size-lg);
                      margin: 8px 0;
                      line-height: 1.4;
                  }
                  
                  .tip-content p {
                      font-size: var(--font-size-sm);
                      margin: 0;
                      line-height: 1.6;
                  }
                  
                   .tip-badge {
                       background: rgba(255, 255, 255, 0.6);
                       padding: 6px 14px;
                       border-radius: 100px;
                       font-size: 11px;
                       font-weight: 800;
                       text-transform: uppercase;
                       display: inline-block;
                       margin-bottom: 8px;
                       letter-spacing: 0.5px;
                   }
                  
                   .tip-image {
                       background: rgba(255, 255, 255, 0.4);
                       backdrop-filter: blur(8px);
                       -webkit-backdrop-filter: blur(8px);
                       width: 72px;
                       height: 72px;
                       border-radius: 24px; /* More modern than circle */
                       display: flex;
                       align-items: center;
                       justify-content: center;
                       flex-shrink: 0;
                       box-shadow: 0 8px 16px rgba(0,0,0,0.1);
                       border: 1px solid rgba(255,255,255,0.3);
                       transform: rotate(5deg); /* Slight rotation for dynamic feel */
                   }
                  
                  .delay-100 { animation-delay: 0.1s; }
                  .delay-200 { animation-delay: 0.2s; }
                  .delay-300 { animation-delay: 0.3s; }
                  
                  .disabled {
                      opacity: 0.5;
                      filter: grayscale(1);
                  }
              `}</style>

        <CustomModal
          isOpen={modalConfig.isOpen}
          onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
          onConfirm={modalConfig.onConfirm}
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
          confirmText={modalConfig.confirmText}
          cancelText={modalConfig.cancelText}
        />
      </div>
    );
  }

  // --- SCAN FLOW VIEW (WIZARD) ---
  return (
    <div className="home scan-mode">
      <div className="scan-header">
        <button onClick={handleResetAndClose} className="back-btn-icon" aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div className="scan-header-title-container">
          <h2 className="scan-title">{t('home.scanPlant') || 'Scan Plant'}</h2>
        </div>
        <div style={{ width: 40 }}></div> {/* Matched Spacer Width */}
      </div>

      <div className="container">
        {/* Progress Stepper used only in Scan Mode */}
        {currentStep <= 2 && (
          <ProgressStepper currentStep={currentStep} steps={steps} />
        )}

        {error && (
          <div className="error-message slide-up">
            <span className="error-icon"><AlertCircle size={20} /></span>
            {error}
          </div>
        )}

        {/* Step 1: Upload Photos */}
        {currentStep === 1 && (
          <div className="step-content fade-in">
            <div className="action-card">
              <div className="card-header">
                <div className="card-icon-bg">
                  <Camera size={24} color="var(--color-primary)" />
                </div>
                <div>
                  <h2 className="card-title">{t('home.uploadPhoto')}</h2>
                  <p className="card-desc">{t('home.uploadDescription')}</p>
                </div>
              </div>

              <CameraUpload
                onImageCapture={handleImageCapture}
                disabled={loading}
              />
            </div>

            {selectedImage && (
              <div className="action-card mt-md bounce-in">
                <div className="card-header">
                  <div className="card-icon-bg">
                    <Leaf size={24} color="var(--color-primary)" />
                  </div>
                  <div>
                    <h3 className="card-title">{t('home.addLeafPhoto')}</h3>
                    <p className="card-desc">{t('home.leafDescription')}</p>
                  </div>
                </div>
                <CameraUpload
                  onImageCapture={handleLeafImageCapture}
                  disabled={loading}
                />
              </div>
            )}

            {selectedImage && (
              <div className="mobile-fixed-bottom">
                <div className="container button-group">
                  <button
                    onClick={handleNextStep}
                    className="btn btn-primary btn-large w-full shadow-lg"
                  >
                    {t('home.continue')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Plant Details */}
        {currentStep === 2 && (
          <div className="step-content fade-in">
            <div className="action-card mb-md">
              <PlantCategorySelector
                selected={selectedCategory}
                onSelect={(category) => dispatch({ type: 'SET_CATEGORY', payload: category })}
                disabled={loading}
              />
            </div>

            <div className="action-card mb-md">
              <FarmScaleSelector
                selected={selectedScale}
                onSelect={(scale) => dispatch({ type: 'SET_SCALE', payload: scale })}
                quantity={scaleQuantity}
                onQuantityChange={(qty) => dispatch({ type: 'SET_QUANTITY', payload: qty })}
                disabled={loading}
                selectedCategory={selectedCategory}
              />
            </div>

            <div className="mobile-fixed-bottom">
              <div className="container button-group-row">
                <button
                  onClick={handlePrevStep}
                  className="btn btn-secondary btn-large w-full"
                >
                  {t('common.back')}
                </button>
                <button
                  onClick={handleNextStep}
                  className="btn btn-primary btn-large w-full shadow-lg"
                  disabled={!selectedCategory}
                >
                  {t('home.analyzePlant')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Analyzing */}
        {currentStep === 3 && (
          <div className="step-content centered">
            <div className="analyzing-container card-glass">
              <div className="spinner-large"></div>
              <h2 className="analyzing-title">
                {analyzingStep === 0 && t('home.uploading')}
                {analyzingStep === 1 && t('home.analyzing')}
                {analyzingStep === 2 && t('home.generating')}
              </h2>

              {currentPeribahasa && (
                <div className="peribahasa-box fade-in">
                  <span className="peribahasa-quote">“</span>
                  <p className="peribahasa-text">{currentPeribahasa}</p>
                  <span className="peribahasa-quote">”</span>
                </div>
              )}

              <div className="analysis-indicator-dots">
                <div className={`dot ${analyzingStep >= 0 ? 'active' : ''}`}></div>
                <div className={`dot ${analyzingStep >= 1 ? 'active' : ''}`}></div>
                <div className={`dot ${analyzingStep >= 2 ? 'active' : ''}`}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .home.scan-mode {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--color-bg-secondary);
          z-index: 2000; /* Above everything */
          overflow-y: auto;
          padding-bottom: 180px; /* Increased to prevent cropping by bottom nav */
        }

        .scan-header {
           display: flex;
           align-items: center;
           justify-content: space-between;
           padding: var(--space-md);
           background: white;
           box-shadow: var(--shadow-sm);
           position: sticky;
           top: 0;
           z-index: 10;
        }
        
        .scan-title {
            font-size: var(--font-size-lg);
            font-weight: 700;
            margin: 0;
        }
        
        .back-btn-icon {
            background: none;
            border: none;
            font-size: 1.5rem;
            color: var(--color-text-secondary);
            cursor: pointer;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            z-index: 2; /* Ensure clickable */
        }

        .scan-header-title-container {
            flex: 1;
            display: flex;
            justify-content: center;
        }
        
        .back-btn-icon:hover {
            background: var(--color-bg-secondary);
        }

        .container {
          max-width: 600px; /* Mobile-first width */
          margin: 0 auto;
          padding: var(--space-md);
        }

        /* Card Styles similar to Grab */
        .action-card {
           background: white;
           border-radius: var(--radius-lg);
           padding: var(--space-lg);
           box-shadow: var(--shadow-sm); /* Very subtle shadow */
           border: 1px solid rgba(0,0,0,0.04);
        }

        .card-header {
           display: flex;
           gap: var(--space-md);
           margin-bottom: var(--space-lg);
        }

        .card-icon-bg {
           background: var(--color-bg-secondary);
           width: 48px;
           height: 48px;
           display: flex;
           align-items: center;
           justify-content: center;
           border-radius: 50%; /* Circle */
        }

        .card-title {
           font-size: var(--font-size-lg);
           font-weight: 600;
           color: var(--color-text-primary);
           margin-bottom: 4px;
        }

        .card-desc {
           font-size: var(--font-size-sm);
           color: var(--color-text-secondary);
           margin: 0;
           line-height: 1.4;
        }

        /* Bottom Button Area - End of Flow */
        .mobile-fixed-bottom {
           position: relative;
           background: transparent;
           padding: var(--space-xl) 0 0 0; /* Add space above */
           width: 100%;
           z-index: 1;
        }
        
        @media (min-width: 768px) {
           .mobile-fixed-bottom {
               position: relative;
               bottom: auto;
               left: auto;
               transform: none;
               width: 100%;
               max-width: 100%;
           }
        }

        .button-group-row {
           display: flex;
           flex-direction: column; /* Stack buttons vertically */
           gap: var(--space-md); /* Improved spacing */
        }

        .error-message {
           background: #FEF2F2;
           color: #991B1B;
           padding: var(--space-md);
           border-radius: var(--radius-md);
           margin-bottom: var(--space-md);
           display: flex;
           align-items: center;
           gap: var(--space-sm);
           font-size: var(--font-size-sm);
           font-weight: 500;
        }

        .step-content.centered {
           display: flex;
           justify-content: center;
           align-items: center;
           min-height: 60vh; /* Ensure it takes up vertical space to center */
        }

        /* Analyzing Screen - Clean */
        .analyzing-container {
           display: flex;
           flex-direction: column;
           align-items: center;
           text-align: center;
           padding: var(--space-2xl);
           background: white;
           border-radius: var(--radius-xl);
           box-shadow: var(--shadow-lg);
           width: 100%;
           max-width: 400px;
           margin: 0 auto; /* Ensure horizontal centering */
        }

        .spinner-large {
           width: 64px;
           height: 64px;
           border: 4px solid var(--color-bg-secondary);
           border-top-color: var(--color-primary);
           border-radius: 50%;
           animation: spin 0.8s linear infinite;
           margin-bottom: var(--space-lg);
        }

        .analysis-indicator-dots {
           display: flex;
           gap: 8px;
           margin-top: var(--space-lg);
        }

        .dot {
           width: 8px;
           height: 8px;
           background: var(--color-border);
           border-radius: 50%;
           transition: background 0.3s ease;
        }

        .dot.active {
           background: var(--color-primary);
           transform: scale(1.2);
        }
        
        .bounce-in {
            animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.9) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        .peribahasa-box {
            margin-top: var(--space-xl);
            padding: var(--space-md) var(--space-lg);
            background: var(--color-bg-secondary);
            border-radius: var(--radius-lg);
            position: relative;
            max-width: 90%;
        }

        .peribahasa-text {
            font-size: var(--font-size-base);
            font-style: italic;
            color: var(--color-primary-dark);
            margin: 0;
            line-height: 1.5;
            font-weight: 500;
        }

        .peribahasa-quote {
            position: absolute;
            font-size: 3rem;
            color: rgba(var(--color-primary-rgb), 0.1);
            line-height: 1;
        }

        .peribahasa-quote:first-child {
            top: -10px;
            left: 5px;
        }

        .peribahasa-quote:last-child {
            bottom: -30px;
            right: 10px;
        }
      `}</style>

      <CustomModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
      />
    </div>
  );
};

export default Home;
