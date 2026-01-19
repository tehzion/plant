import React from 'react';
import { MapPin, Clock, Sun, CloudSun, CloudRain, Snowflake, CloudLightning } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';
import LanguageSelector from '../LanguageSelector';

const HeroSection = ({
    greeting,
    locationName,
    isLocating,
    onLocationClick,
    weatherTemp,
    weatherIcon,
    language
}) => {
    const { t } = useLanguage();

    const renderWeatherIcon = () => {
        switch (weatherIcon) {
            case 'sun': return <Sun size={24} color="#FDB813" strokeWidth={1.5} />;
            case 'cloud-sun': return <CloudSun size={24} color="#FDB813" strokeWidth={1.5} />;
            case 'cloud-rain': return <CloudRain size={24} color="#4A90E2" strokeWidth={1.5} />;
            case 'snowflake': return <Snowflake size={24} color="#A0C4FF" strokeWidth={1.5} />;
            case 'cloud-lightning': return <CloudLightning size={24} color="#7C4DFF" strokeWidth={1.5} />;
            default: return <CloudSun size={24} color="#FDB813" strokeWidth={1.5} />;
        }
    };

    return (
        <div className="dashboard-header">
            <div className="hero-content-wrapper">
                <div className="greeting-container">
                    <h1 className="greeting">{greeting}, {t('common.farmer')}!</h1>
                    <p className="date-display">
                        <span
                            style={{ color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={onLocationClick}
                        >
                            <MapPin size={16} strokeWidth={1.5} /> {locationName ? t(locationName) : (isLocating ? t('common.locating') : t('common.setLocation'))} <Clock size={16} strokeWidth={1.5} />
                        </span>
                        <br />
                        {new Date().toLocaleDateString(t('common.dateLocale') || 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div className="header-controls">
                    <div className="weather-widget">
                        <span className="weather-icon">{renderWeatherIcon()}</span>
                        <span className="weather-temp">{weatherTemp ? `${weatherTemp}°C` : '--°C'}</span>
                    </div>
                </div>
            </div>

            <style>{`
                .hero-content-wrapper {
                    display: flex;
                    justify-content: space-between;
                    flex: 1;
                    align-items: flex-end; /* Align controls with bottom of text */
                }

                .header-controls {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    align-items: flex-end;
                }

                @media (max-width: 768px) {
                    .dashboard-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 8px;
                        position: relative;
                        padding-top: 10px;
                    }
                    
                    .hero-content-wrapper {
                        width: 100%;
                        display: flex;
                        flex-direction: row; /* Greeting Left, Weather Right */
                        justify-content: space-between;
                        align-items: flex-start;
                        min-height: auto;
                    }
                    
                    .greeting-container {
                        width: auto;
                        padding-right: 12px;
                        flex: 1;
                    }
                    
                    .greeting-container .greeting {
                        font-size: 1.5rem; /* Standard size */
                        line-height: 1.2;
                    }
                    
                    .header-controls {
                        display: flex;
                        flex-direction: column;
                        align-items: flex-end;
                        justify-content: flex-start;
                        gap: 8px;
                        position: relative;
                        bottom: auto;
                        right: auto;
                        margin-top: 4px;
                    }
                }
            `}</style>
        </div >
    );
};

export default HeroSection;
