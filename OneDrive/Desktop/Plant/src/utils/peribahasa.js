// Utility to get random peribahasa (Malaysian proverbs)
// Usage: import { getRandomPeribahasa } from './utils/peribahasa';

import { translations } from '../i18n/translations';

/**
 * Get a random peribahasa (proverb) based on current language
 * @param {string} language - 'en' or 'ms'
 * @returns {string} Random peribahasa
 */
export const getRandomPeribahasa = (language = 'en') => {
    const peribahasa = translations[language]?.home?.peribahasa || [];

    if (peribahasa.length === 0) {
        return language === 'ms'
            ? 'Tanaman anda membesar dengan sihat! 🌱'
            : 'Your plants are growing strong! 🌱';
    }

    const randomIndex = Math.floor(Math.random() * peribahasa.length);
    return peribahasa[randomIndex];
};

/**
 * Get multiple random peribahasa (without duplicates)
 * @param {string} language - 'en' or 'ms'
 * @param {number} count - Number of peribahasa to get
 * @returns {string[]} Array of random peribahasa
 */
export const getRandomPeribahasaList = (language = 'en', count = 3) => {
    const peribahasa = translations[language]?.home?.peribahasa || [];

    if (peribahasa.length === 0) {
        return [
            language === 'ms'
                ? 'Tanaman anda membesar dengan sihat! 🌱'
                : 'Your plants are growing strong! 🌱'
        ];
    }

    // Shuffle and take first 'count' items
    const shuffled = [...peribahasa].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, peribahasa.length));
};

/**
 * Get a contextual peribahasa based on the situation
 * @param {string} language - 'en' or 'ms'
 * @param {string} context - 'loading', 'success', 'healthy', 'diseased'
 * @returns {string} Contextual peribahasa
 */
export const getContextualPeribahasa = (language = 'en', context = 'loading') => {
    const peribahasa = translations[language]?.home?.peribahasa || [];

    if (peribahasa.length === 0) {
        return getRandomPeribahasa(language);
    }

    // For now, return random. Can be enhanced to filter by context
    return getRandomPeribahasa(language);
};

export default {
    getRandomPeribahasa,
    getRandomPeribahasaList,
    getContextualPeribahasa
};
