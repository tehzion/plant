import { useState, useCallback } from 'react';

export const useWeather = () => {
    const [weatherTemp, setWeatherTemp] = useState(null);
    const [weatherIcon, setWeatherIcon] = useState('cloud-sun');
    const [loading, setLoading] = useState(false);

    const fetchWeather = useCallback(async (lat, lng) => {
        if (!lat || !lng) return;

        setLoading(true);
        try {
            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`);
            const weatherData = await weatherRes.json();
            const current = weatherData.current_weather;

            if (current) {
                setWeatherTemp(Math.round(current.temperature));
                const code = current.weathercode;

                // Map WMO codes to icon names
                if (code === 0) setWeatherIcon('sun');
                else if (code <= 3) setWeatherIcon('cloud-sun');
                else if (code <= 69) setWeatherIcon('cloud-rain');
                else if (code <= 79) setWeatherIcon('snowflake');
                else if (code <= 99) setWeatherIcon('cloud-lightning');
            }
        } catch (e) {
            console.error("Weather fetch failed", e);
            // Fallback
            setWeatherTemp(30);
            setWeatherIcon('sun');
        } finally {
            setLoading(false);
        }
    }, []);

    return { weatherTemp, weatherIcon, loading, fetchWeather };
};
