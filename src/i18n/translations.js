import commonTranslations from './translations/common.js';
import footerTranslations from './translations/footer.js';
import navTranslations from './translations/nav.js';
import profileTranslations from './translations/profile.js';
import formTranslations from './translations/form.js';
import settingsTranslations from './translations/settings.js';
import userGuideTranslations from './translations/userGuide.js';
import homeTranslations from './translations/home.js';
import resultsTranslations from './translations/results.js';
import mygapTranslations from './translations/mygap.js';
import encyclopediaTranslations from './translations/encyclopedia.js';
import historyTranslations from './translations/history.js';
import pdfTranslations from './translations/pdf.js';
import loginTranslations from './translations/login.js';
import onboardingTranslations from './translations/onboarding.js';
import termsTranslations from './translations/terms.js';
import feedbackTranslations from './translations/feedback.js';
import privacyTranslations from './translations/privacy.js';

const translationSections = [
    commonTranslations,
    footerTranslations,
    navTranslations,
    profileTranslations,
    formTranslations,
    settingsTranslations,
    userGuideTranslations,
    homeTranslations,
    resultsTranslations,
    mygapTranslations,
    encyclopediaTranslations,
    historyTranslations,
    pdfTranslations,
    loginTranslations,
    onboardingTranslations,
    termsTranslations,
    feedbackTranslations,
    privacyTranslations,
];

const mergeTranslationSections = (...sections) => {
    const languages = new Set(sections.flatMap((section) => Object.keys(section)));
    const merged = {};

    for (const language of languages) {
        merged[language] = Object.assign({}, ...sections.map((section) => section[language] || {}));
    }

    return merged;
};

export const translations = mergeTranslationSections(...translationSections);

export default translations;
