import { useState, useCallback } from 'react';

export const useLocation = () => {
    const [location, setLocation] = useState(null);
    const [locationName, setLocationName] = useState('');
    const [isLocating, setIsLocating] = useState(false);
    const [error, setError] = useState(null);

    const getLocation = useCallback(() => {
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
                    const loc = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
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
                { timeout: 15000, enableHighAccuracy: false }
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
