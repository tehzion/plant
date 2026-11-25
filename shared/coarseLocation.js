// Weather and locality lookup need an area, not a precise farm coordinate.
export const coarseLocation = value => {
    const lat = Number(value?.lat), lng = Number(value?.lng);
    if (value?.lat == null || value?.lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 };
};
