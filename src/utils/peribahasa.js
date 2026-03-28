import { translations } from '../i18n/translations';

const getFallbackPeribahasa = (language = 'en') => (
    translations[language]?.home?.peribahasaFallback
    || translations.en?.home?.peribahasaFallback
    || 'Your plants are growing strong! 🌱'
);

export const getRandomPeribahasa = (language = 'en') => {
    const peribahasa = translations[language]?.home?.peribahasa || [];

    if (peribahasa.length === 0) {
        return getFallbackPeribahasa(language);
    }

    const randomIndex = Math.floor(Math.random() * peribahasa.length);
    return peribahasa[randomIndex];
};

export const getRandomPeribahasaList = (language = 'en', count = 3) => {
    const peribahasa = translations[language]?.home?.peribahasa || [];

    if (peribahasa.length === 0) {
        return [getFallbackPeribahasa(language)];
    }

    const shuffled = [...peribahasa].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, peribahasa.length));
};

export const getContextualPeribahasa = (language = 'en', _context = 'loading') => {
    const peribahasa = translations[language]?.home?.peribahasa || [];

    if (peribahasa.length === 0) {
        return getRandomPeribahasa(language);
    }

    return getRandomPeribahasa(language);
};

export default {
    getRandomPeribahasa,
    getRandomPeribahasaList,
    getContextualPeribahasa,
};
