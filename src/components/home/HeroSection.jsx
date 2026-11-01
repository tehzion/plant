import React from 'react';
import { MapPin, Sun, CloudSun, CloudRain, Snowflake, CloudLightning, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../i18n/i18n.jsx';

const HeroSection = ({
    greeting,
    locationName,
    isLocating,
    onLocationClick,
    weatherTemp,
    weatherIcon,
    weatherError,
    onWeatherRetry,
}) => {
    const { t } = useLanguage();
    const hasWeatherTemp = Number.isFinite(weatherTemp);

    const resolvedWeatherNote = weatherError
        ? (() => {
            const translated = t(weatherError);
            return translated !== weatherError ? translated : weatherError;
        })()
        : '';

    // No weather to show: the pill turns into a retry button, and the reason
    // stays in its accessible name instead of a red line under the shelf.
    const showWeatherRetry = !hasWeatherTemp && Boolean(weatherError);
    const showCachedNote = hasWeatherTemp && Boolean(weatherError);

    const translatedLocation = locationName ? t(`common.${locationName}`) : '';
    // A missing location is something the farmer can fix, so the pill asks for it.
    const resolvedLocation = locationName && locationName !== 'common.locationNA'
        ? (locationName.startsWith('common.')
            ? t(locationName)
            : (translatedLocation !== `common.${locationName}` ? translatedLocation : locationName))
        : (isLocating ? t('common.locating') : t('common.setLocationShort'));

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
        <div className="dashboard-header home-hero-shell">
            <div className="hero-content home-hero-content">
                <div className="greeting-container">
                    <h1 className="greeting home-hero-greeting">
                        {greeting}, {t('common.farmer')}!
                    </h1>
                </div>

                <div className="superapp-shelf-container home-hero-shelf">
                    <button
                        type="button"
                        className="superapp-stat-pill home-location-pill"
                        onClick={onLocationClick}
                        aria-busy={isLocating}
                        aria-label={`${t('common.location') || 'Location'}: ${resolvedLocation}`}
                    >
                        <span className="superapp-stat-pill-label home-location-label">
                            <MapPin size={12} strokeWidth={2.5} />
                            {t('common.location') || 'Location'}
                        </span>
                        <span className="superapp-stat-pill-value home-location-value">
                            {resolvedLocation}
                        </span>
                    </button>

                    {showWeatherRetry ? (
                        <button
                            type="button"
                            className="superapp-stat-pill home-weather-pill home-weather-pill--retry"
                            onClick={onWeatherRetry}
                            aria-label={`${resolvedWeatherNote} ${t('common.retry')}`}
                            title={resolvedWeatherNote}
                        >
                            <span className="superapp-stat-pill-label">
                                {t('profile.weatherForecast') || 'Weather'}
                            </span>
                            <span className="home-weather-row">
                                <RefreshCw size={16} strokeWidth={2} aria-hidden="true" />
                                <span className="home-weather-retry-text">{t('common.retry')}</span>
                            </span>
                        </button>
                    ) : (
                        <div className="superapp-stat-pill home-weather-pill">
                            <span className="superapp-stat-pill-label">
                                {t('profile.weatherForecast') || 'Weather'}
                            </span>
                            <div className="home-weather-row">
                                {renderWeatherIcon()}
                                <span className="superapp-stat-pill-value home-weather-value">
                                    {hasWeatherTemp ? `${Math.round(weatherTemp)}°C` : '--'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {showCachedNote && resolvedWeatherNote && (
                    <div className="weather-error-note">
                        {resolvedWeatherNote}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HeroSection;
