import { useState, useCallback } from 'react';
import { fetchJsonWithTimeout } from '../utils/networkRequest.js';

const WEATHER_CACHE_PREFIX = 'kanb.weather.v1';
const WEATHER_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

// WMO weather code -> icon name
const wmoIcon = (code) => {
    if (code === 0) return 'sun';
    if (code <= 3) return 'cloud-sun';
    if (code <= 49) return 'cloud';
    if (code <= 69) return 'cloud-rain';
    if (code <= 79) return 'snowflake';
    if (code <= 99) return 'cloud-lightning';
    return 'cloud-sun';
};

const wmoDescKey = (code) => {
    if (code === 0) return 'profile.weather.descClearSky';
    if (code <= 3) return 'profile.weather.descPartlyCloudy';
    if (code <= 49) return 'profile.weather.descFog';
    if (code <= 55) return 'profile.weather.descDrizzle';
    if (code <= 65) return 'profile.weather.descRain';
    if (code <= 69) return 'profile.weather.descFreezingRain';
    if (code <= 79) return 'profile.weather.descSnow';
    if (code <= 82) return 'profile.weather.descRainShowers';
    if (code <= 86) return 'profile.weather.descSnowShowers';
    if (code <= 99) return 'profile.weather.descThunderstorm';
    return 'profile.weather.descUnknown';
};

const buildWeatherCacheKey = (lat, lng) => {
    const safeLat = Number.isFinite(Number(lat)) ? Number(lat).toFixed(2) : '0.00';
    const safeLng = Number.isFinite(Number(lng)) ? Number(lng).toFixed(2) : '0.00';
    return `${WEATHER_CACHE_PREFIX}:${safeLat}:${safeLng}`;
};

const readWeatherCache = (lat, lng) => {
    if (typeof window === 'undefined' || !window.localStorage) return null;

    try {
        const raw = window.localStorage.getItem(buildWeatherCacheKey(lat, lng));
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        const timestamp = Number(parsed?.timestamp || 0);
        const ageMs = Date.now() - timestamp;
        if (!Number.isFinite(ageMs) || ageMs > WEATHER_CACHE_MAX_AGE_MS) {
            return null;
        }

        return {
            weatherTemp: Number.isFinite(parsed?.weatherTemp) ? parsed.weatherTemp : null,
            weatherIcon: typeof parsed?.weatherIcon === 'string' ? parsed.weatherIcon : 'cloud-sun',
            forecast: Array.isArray(parsed?.forecast) ? parsed.forecast : [],
        };
    } catch {
        return null;
    }
};

const writeWeatherCache = (lat, lng, payload) => {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
        window.localStorage.setItem(
            buildWeatherCacheKey(lat, lng),
            JSON.stringify({
                timestamp: Date.now(),
                weatherTemp: payload.weatherTemp,
                weatherIcon: payload.weatherIcon,
                forecast: Array.isArray(payload.forecast) ? payload.forecast : [],
            }),
        );
    } catch {
        // Ignore cache-write failures and keep the UI responsive.
    }
};

/**
 * Derives farming notice translation key from daily forecast values.
 * @param {{ precip: number, humidity: number, uvIndex: number, tempMax: number }} day
 * @returns {{ status: 'good'|'caution'|'warning', key: string }}
 */
export const deriveFarmingNotice = ({ precip = 0, humidity = 70, uvIndex = 5, tempMax = 30 }) => {
    if (precip > 25) {
        return { status: 'warning', key: 'profile.weather.noticeHeavyRain' };
    }
    if (precip > 8) {
        return { status: 'caution', key: 'profile.weather.noticeModerateRain' };
    }
    if (uvIndex > 9) {
        return { status: 'caution', key: 'profile.weather.noticeHighUV' };
    }
    if (tempMax > 36) {
        return { status: 'caution', key: 'profile.weather.noticeHeatStress' };
    }
    if (humidity < 50) {
        return { status: 'caution', key: 'profile.weather.noticeLowHumidity' };
    }
    return { status: 'good', key: 'profile.weather.noticeGood' };
};

export const useWeather = () => {
    const [weatherTemp, setWeatherTemp] = useState(null);
    const [weatherIcon, setWeatherIcon] = useState('cloud-sun');
    const [forecast, setForecast] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchWeather = useCallback(async (lat, lng) => {
        if (!lat || !lng) return;

        setLoading(true);
        setError(null);

        try {
            const url = [
                'https://api.open-meteo.com/v1/forecast',
                `?latitude=${lat}&longitude=${lng}`,
                '&current_weather=true',
                '&daily=precipitation_sum,relative_humidity_2m_max,uv_index_max,temperature_2m_max,weathercode',
                '&timezone=auto',
                '&forecast_days=5',
            ].join('');

            const data = await fetchJsonWithTimeout(
                url,
                {},
                {
                    timeoutMs: 10000,
                    timeoutMessage: 'profile.weatherErrorTimeout',
                    networkMessage: 'profile.weatherErrorNetwork',
                    unavailableMessage: 'profile.weatherErrorUnavailable',
                },
            );

            const current = data.current_weather;
            let nextTemp = null;
            let nextIcon = 'cloud-sun';
            if (current) {
                nextTemp = Math.round(current.temperature);
                nextIcon = wmoIcon(current.weathercode);
                setWeatherTemp(nextTemp);
                setWeatherIcon(nextIcon);
            } else {
                setWeatherTemp(null);
                setWeatherIcon('cloud-sun');
            }

            let nextForecast = [];
            if (data.daily?.time) {
                nextForecast = data.daily.time.map((date, i) => {
                    const precip = data.daily.precipitation_sum?.[i] ?? 0;
                    const humidity = data.daily.relative_humidity_2m_max?.[i] ?? 70;
                    const uvIndex = data.daily.uv_index_max?.[i] ?? 5;
                    const tempMax = data.daily.temperature_2m_max?.[i] ?? 30;
                    const code = data.daily.weathercode?.[i] ?? 0;

                    return {
                        date,
                        precip,
                        humidity,
                        uvIndex,
                        tempMax,
                        icon: wmoIcon(code),
                        descKey: wmoDescKey(code),
                        notice: deriveFarmingNotice({ precip, humidity, uvIndex, tempMax }),
                    };
                });
            }

            setForecast(nextForecast);
            writeWeatherCache(lat, lng, {
                weatherTemp: nextTemp,
                weatherIcon: nextIcon,
                forecast: nextForecast,
            });
        } catch (e) {
            console.error('Weather fetch failed', e);
            const cached = readWeatherCache(lat, lng);
            if (cached) {
                setWeatherTemp(cached.weatherTemp);
                setWeatherIcon(cached.weatherIcon);
                setForecast(cached.forecast);
                setError('profile.weatherUsingCached');
            } else {
                setWeatherTemp(null);
                setWeatherIcon('cloud-sun');
                setForecast([]);
                if (e?.message === 'profile.weatherErrorTimeout') {
                    setError('profile.weatherErrorTimeout');
                } else if (e?.message === 'profile.weatherErrorNetwork') {
                    setError('profile.weatherErrorNetwork');
                } else {
                    setError('profile.weatherErrorUnavailable');
                }
            }
        } finally {
            setLoading(false);
        }
    }, []);

    return { weatherTemp, weatherIcon, forecast, loading, error, fetchWeather };
};
