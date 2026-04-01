import { translations } from '../i18n/translations';

const fallbackPeribahasaByLanguage = {
    en: 'Your plants are growing strong! 🌱',
    ms: 'Tanaman anda membesar dengan sihat! 🌱',
    zh: '您的植物正在茁壮成长！ 🌱',
};

const isBrokenPeribahasaText = (value) => (
    typeof value !== 'string'
    || !value.trim()
    || /ðŸ|Ã|�/.test(value)
);

const getSafePeribahasaList = (language = 'en') => {
    const localizedList = translations[language]?.home?.peribahasa;
    if (!Array.isArray(localizedList)) {
        return [];
    }

    return localizedList.filter((item) => !isBrokenPeribahasaText(item));
};

const getFallbackPeribahasa = (language = 'en') => {
    const localizedFallback = translations[language]?.home?.peribahasaFallback;
    if (!isBrokenPeribahasaText(localizedFallback)) {
        return localizedFallback;
    }

    return fallbackPeribahasaByLanguage[language] || fallbackPeribahasaByLanguage.en;
};

export const getRandomPeribahasa = (language = 'en') => {
    const peribahasa = getSafePeribahasaList(language);

    if (peribahasa.length === 0) {
        return getFallbackPeribahasa(language);
    }

    const randomIndex = Math.floor(Math.random() * peribahasa.length);
    return peribahasa[randomIndex];
};

export const getRandomPeribahasaList = (language = 'en', count = 3) => {
    const peribahasa = getSafePeribahasaList(language);

    if (peribahasa.length === 0) {
        return [getFallbackPeribahasa(language)];
    }

    const shuffled = [...peribahasa].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, peribahasa.length));
};

export const getContextualPeribahasa = (language = 'en', _context = 'loading') => {
    const peribahasa = getSafePeribahasaList(language);

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
