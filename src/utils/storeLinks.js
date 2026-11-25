// Store links opened from the app carry UTM tags. WooCommerce's built-in order
// attribution (WooCommerce 8.5+) reads them on the first page load and shows
// "Source: kanb-agropreneur" on each order, so the store team can see which
// orders came from a plant check.
export const STORE_UTM_SOURCE = 'kanb-agropreneur';
export const STORE_UTM_MEDIUM = 'app';

export const withStoreAttribution = (url, campaign = 'plant-check') => {
    if (!url) return url;
    try {
        const parsed = new URL(url);
        if (!/^https?:$/.test(parsed.protocol)) return url;
        if (!parsed.searchParams.has('utm_source')) parsed.searchParams.set('utm_source', STORE_UTM_SOURCE);
        if (!parsed.searchParams.has('utm_medium')) parsed.searchParams.set('utm_medium', STORE_UTM_MEDIUM);
        if (!parsed.searchParams.has('utm_campaign') && campaign) parsed.searchParams.set('utm_campaign', campaign);
        return parsed.toString();
    } catch {
        return url;
    }
};
