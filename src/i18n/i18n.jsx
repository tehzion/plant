import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import translations from './translations';

const LanguageContext = createContext();

/**
 * isBrokenLocalizedString - Sanitizes strings that may be malformed or have encoding errors.
 */
const isBrokenLocalizedString = (value, activeLanguage) => {
    if (activeLanguage !== 'zh' || typeof value !== 'string') return false;
    return /\?{2,}|Ã‚|Ãƒ|Ã°Å¸|Ã¢|ï¿½/.test(value);
};

/**
 * lookupValue - Deep-traverses a translation dictionary using a dotted-key path.
 */
const lookupValue = (languageKey, keys) => {
    let value = translations[languageKey];
    for (const keyPart of keys) {
        value = value?.[keyPart];
        if (value === undefined) return undefined;
    }
    return value;
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        const savedLanguage = localStorage.getItem('appLanguage');
        return savedLanguage || 'ms';
    });

    useEffect(() => {
        localStorage.setItem('appLanguage', language);
    }, [language]);

    const resolveTranslation = useCallback((key) => {
        const keys = key.split('.');

        let value = lookupValue(language, keys);
        if (value === undefined || isBrokenLocalizedString(value, language)) {
            // Fallback to English
            value = lookupValue('en', keys);
            if (value === undefined) {
                console.warn(`Translation missing for key: ${key}`);
                return key;
            }
        }

        return value || key;
    }, [language]);

    /**
     * t - Standard translation helper
     */
    const t = useCallback((key) => resolveTranslation(key), [resolveTranslation]);

    /**
     * label - Safe translation label with explicit fallback
     * Optimized for global use via useLanguage()
     */
    const label = useCallback((key, fallback) => {
        const value = resolveTranslation(key);
        return value && value !== key ? value : fallback;
    }, [resolveTranslation]);

    const value = {
        language,
        setLanguage,
        t,
        label,
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export default LanguageContext;

