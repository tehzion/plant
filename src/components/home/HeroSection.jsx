import React from 'react';
import { MapPin, Clock, Sun, CloudSun, CloudRain, Snowflake, CloudLightning } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';

const HeroSection = ({
    greeting,
    locationName,
    isLocating,
    onLocationClick,
    weatherTemp,
    weatherIcon,
    weatherError,
}) => {
    const { t } = useLanguage();
    const hasWeatherTemp = Number.isFinite(weatherTemp);

    const resolvedWeatherNote = weatherError
        ? (() => {
            const translated = t(weatherError);
            return translated !== weatherError ? translated : weatherError;
        })()
        : '';

    const translatedLocation = locationName ? t(`common.${locationName}`) : '';
    const resolvedLocation = locationName
        ? (locationName.startsWith('common.')
            ? t(locationName)
            : (translatedLocation !== `common.${locationName}` ? translatedLocation : locationName))
        : (isLocating ? t('common.locating') : t('common.setLocation'));

    const renderWeatherIcon = () => {
        switch (weatherIcon) {
            case 'sun':
                return (
                    <div className="anim-weather-sun">
                        <Sun size={24} color="#FDB813" strokeWidth={1.5} />
                    </div>
                );
            case 'cloud-sun':
                return (
                    <div className="anim-weather-cloud">
                        <CloudSun size={24} color="#FDB813" strokeWidth={1.5} />
                    </div>
                );
            case 'cloud-rain':
                return (
                    <div className="anim-weather-rain">
                        <CloudRain size={24} color="#4A90E2" strokeWidth={1.5} />
                    </div>
                );
            case 'snowflake':
                return (
                    <div className="anim-weather-snow">
                        <Snowflake size={24} color="#A0C4FF" strokeWidth={1.5} />
                    </div>
                );
            case 'cloud-lightning':
                return (
                    <div className="anim-weather-storm">
                        <CloudLightning size={24} color="#7C4DFF" strokeWidth={1.5} />
                    </div>
                );
            default:
                return <CloudSun size={24} color="#FDB813" strokeWidth={1.5} />;
        }
    };

    return (
        <div className="dashboard-header" style={{ paddingBottom: '24px' }}>
            <div className="hero-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="greeting-container">
                    <h1 className="greeting" style={{ margin: '0 0 16px 0', fontSize: '2.4rem', fontWeight: '850', color: 'var(--color-primary-dark)' }}>
                        {greeting}, {t('common.farmer')}!
                    </h1>
                </div>

                <div className="superapp-shelf-container" style={{ margin: '0', padding: '4px 0 12px 0' }}>
                    {/* Location Pill */}
                    <div className="superapp-stat-pill" onClick={onLocationClick} style={{ cursor: 'pointer', flex: '1' }}>
                        <span className="superapp-stat-pill-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={12} strokeWidth={2.5} />
                            {t('common.location') || 'Location'}
                        </span>
                        <span className="superapp-stat-pill-value" style={{ fontSize: '1.1rem' }}>
                            {resolvedLocation}
                        </span>
                    </div>

                    {/* Weather Pill */}
                    <div className="superapp-stat-pill" style={{ flex: '0 0 125px' }}>
                        <span className="superapp-stat-pill-label">
                            {t('profile.weatherForecast') || 'Weather'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {renderWeatherIcon()}
                            <span className="superapp-stat-pill-value" style={{ fontSize: '1.25rem' }}>
                                {hasWeatherTemp ? `${Math.round(weatherTemp)}°C` : '--'}
                            </span>
                        </div>
                    </div>
                </div>

                {weatherError && resolvedWeatherNote && (
                    <div className="weather-error-note" style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', padding: '0 4px' }}>
                        {resolvedWeatherNote}
                    </div>
                )}
            </div>

            <style>{`
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
                        flex-direction: row;
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
                        font-size: 1.5rem;
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

                    .hero-weather-note {
                        max-width: 150px;
                        font-size: 0.68rem;
                        padding: 5px 8px;
                    }
                }
            `}</style>
        </div>
    );
};

export default HeroSection;
