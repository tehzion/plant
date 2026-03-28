import { useState, useCallback } from 'react';

// WMO weather code → icon name
const wmoIcon = (code) => {
    if (code === 0)       return 'sun';
    if (code <= 3)        return 'cloud-sun';
    if (code <= 49)       return 'cloud';
    if (code <= 69)       return 'cloud-rain';
    if (code <= 79)       return 'snowflake';
    if (code <= 99)       return 'cloud-lightning';
    return 'cloud-sun';
};

/**
 * Maps a WMO code to a translation key.
 */
const wmoDescKey = (code) => {
    if (code === 0)            return 'weather.descClearSky';
    if (code <= 3)             return 'weather.descPartlyCloudy';
    if (code <= 49)            return 'weather.descFog';
    if (code <= 55)            return 'weather.descDrizzle';
    if (code <= 65)            return 'weather.descRain';
    if (code <= 69)            return 'weather.descFreezingRain';
    if (code <= 79)            return 'weather.descSnow';
    if (code <= 82)            return 'weather.descRainShowers';
    if (code <= 86)            return 'weather.descSnowShowers';
    if (code <= 99)            return 'weather.descThunderstorm';
    return 'weather.descUnknown';
};

/**
 * Derives farming notice translation key from daily forecast values.
 * @param {{ precip: number, humidity: number, uvIndex: number, tempMax: number }} day
 * @returns {{ status: 'good'|'caution'|'warning', key: string }}
 */
export const deriveFarmingNotice = ({ precip = 0, humidity = 70, uvIndex = 5, tempMax = 30 }) => {
    if (precip > 25) {
        return { status: 'warning', key: 'weather.noticeHeavyRain' };
    }
    if (precip > 8) {
        return { status: 'caution', key: 'weather.noticeModerateRain' };
    }
    if (uvIndex > 9) {
        return { status: 'caution', key: 'weather.noticeHighUV' };
    }
    if (tempMax > 36) {
        return { status: 'caution', key: 'weather.noticeHeatStress' };
    }
    if (humidity < 50) {
        return { status: 'caution', key: 'weather.noticeLowHumidity' };
    }
    return { status: 'good', key: 'weather.noticeGood' };
};

export const useWeather = () => {
    const [weatherTemp, setWeatherTemp]   = useState(null);
    const [weatherIcon, setWeatherIcon]   = useState('cloud-sun');
    const [forecast, setForecast]         = useState([]);   // array of daily forecast objects
    const [loading, setLoading]           = useState(false);

    const fetchWeather = useCallback(async (lat, lng) => {
        if (!lat || !lng) return;
        setLoading(true);
        try {
            const url = [
                `https://api.open-meteo.com/v1/forecast`,
                `?latitude=${lat}&longitude=${lng}`,
                `&current_weather=true`,
                // 5-day daily fields for farming notices
                `&daily=precipitation_sum,relative_humidity_2m_max,uv_index_max,temperature_2m_max,weathercode`,
                `&timezone=auto`,
                `&forecast_days=5`,
            ].join('');

            const res  = await fetch(url);
            const data = await res.json();

            // ── Current conditions ───────────────────────────────────
            const current = data.current_weather;
            if (current) {
                setWeatherTemp(Math.round(current.temperature));
                setWeatherIcon(wmoIcon(current.weathercode));
            }

            // ── Daily forecast ───────────────────────────────────────
            if (data.daily && data.daily.time) {
                const days = data.daily.time.map((date, i) => {
                    const precip   = data.daily.precipitation_sum?.[i]        ?? 0;
                    const humidity = data.daily.relative_humidity_2m_max?.[i] ?? 70;
                    const uvIndex  = data.daily.uv_index_max?.[i]             ?? 5;
                    const tempMax  = data.daily.temperature_2m_max?.[i]       ?? 30;
                    const code     = data.daily.weathercode?.[i]              ?? 0;

                    return {
                        date,
                        precip,
                        humidity,
                        uvIndex,
                        tempMax,
                        icon:      wmoIcon(code),
                        descKey:   wmoDescKey(code),
                        notice:    deriveFarmingNotice({ precip, humidity, uvIndex, tempMax }),
                    };
                });
                setForecast(days);
            }
        } catch (e) {
            console.error('Weather fetch failed', e);
            setWeatherTemp(30);
            setWeatherIcon('sun');
        } finally {
            setLoading(false);
        }
    }, []);

    return { weatherTemp, weatherIcon, forecast, loading, fetchWeather };
};
