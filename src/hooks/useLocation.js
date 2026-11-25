import { coarseLocation } from '../../shared/coarseLocation.js';
import { useState, useCallback } from 'react';

export const useLocation = () => {
    const [location, setLocation] = useState(null);
    const [locationName, setLocationName] = useState('');
    const [isLocating, setIsLocating] = useState(false);
    const [error, setError] = useState(null);

    const getLocation = useCallback(() => {
        let ms = false;
        try { ms = localStorage.getItem('appLanguage') === 'ms'; } catch { /* language fallback */ }
        const allowed = window.confirm(ms
            ? 'Gunakan lokasi anggaran untuk cuaca dan nama kawasan? Koordinat dibundarkan akan dikongsi dengan Open-Meteo dan Nominatim/OpenStreetMap. Pilihan ini tidak diperlukan untuk imbasan. Lihat notis privasi untuk butiran.'
            : 'Use approximate location for weather and your area name? Rounded coordinates will be shared with Open-Meteo and Nominatim/OpenStreetMap. This is optional for scanning. See the privacy notice for details.');
        if (!allowed) return Promise.resolve(null);
        setIsLocating(true);
        setError(null);

        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                setError('Geolocation not supported');
                setIsLocating(false);
                resolve(null);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const loc = coarseLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                    if (!loc) { setIsLocating(false); resolve(null); return; }
                    setLocation(loc);

                    // Reverse Geocoding
                    try {
                        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}`);
                        const geoData = await geoRes.json();
                        const city = geoData.address.city ||
                            geoData.address.town ||
                            geoData.address.village ||
                            geoData.address.district ||
                            geoData.address.state ||
                            'common.unknownLocation';
                        setLocationName(city);
                    } catch (e) {
                        console.error("Geocoding failed", e);
                        setLocationName('common.unknownLocation');
                    }

                    setIsLocating(false);
                    resolve(loc);
                },
                (err) => {
                    console.warn('Geolocation error:', err);
                    setError(err.message);

                    // Fallback
                    setLocationName('common.locationNA');
                    setIsLocating(false);
                    resolve(null);
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 10000 }
            );
        });
    }, []);

    return {
        location,
        locationName,
        isLocating,
        error,
        getLocation,
        setLocationName // Allow manual override if needed
    };
};
