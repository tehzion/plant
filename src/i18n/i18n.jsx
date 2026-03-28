import { createContext, useContext, useEffect, useState } from 'react';
import translations from './translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        const savedLanguage = localStorage.getItem('appLanguage');
        return savedLanguage || 'ms';
    });

    useEffect(() => {
        localStorage.setItem('appLanguage', language);
    }, [language]);

    const isBrokenLocalizedString = (value, activeLanguage) => {
        if (activeLanguage !== 'zh' || typeof value !== 'string') return false;
        return /\?{2,}|Ã‚|Ãƒ|Ã°Å¸|Ã¢|ï¿½/.test(value);
    };

    const lookupValue = (languageKey, keys) => {
        let value = translations[languageKey];
        for (const keyPart of keys) {
            value = value?.[keyPart];
            if (value === undefined) return undefined;
        }
        return value;
    };

    const resolveTranslation = (key) => {
        const keys = key.split('.');

        let value = lookupValue(language, keys);
        if (value === undefined || isBrokenLocalizedString(value, language)) {
            value = lookupValue('en', keys);
            if (value === undefined) {
                console.warn(`Translation missing for key: ${key}`);
                return key;
            }
        }

        return value || key;
    };

    const t = (key) => resolveTranslation(key);

    const label = (key, fallback) => {
        const value = resolveTranslation(key);
        return value && value !== key ? value : fallback;
    };

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
