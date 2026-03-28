import { createContext, useContext, useState, useEffect } from 'react';
import translations from './translations';

// Create Language Context
const LanguageContext = createContext();

// Language Provider Component
export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        // Get saved language from localStorage, default to Bahasa Malaysia
        const savedLanguage = localStorage.getItem('appLanguage');
        return savedLanguage || 'ms'; // Changed default from 'en' to 'ms'
    });

    // Save language preference to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('appLanguage', language);
    }, [language]);

    const isBrokenLocalizedString = (value, activeLanguage) => {
        if (activeLanguage !== 'zh' || typeof value !== 'string') return false;
        return /\?{2,}|Â|Ã|ðŸ|â|�/.test(value);
    };

    const lookupValue = (languageKey, keys) => {
        let value = translations[languageKey];
        for (const keyPart of keys) {
            value = value?.[keyPart];
            if (value === undefined) return undefined;
        }
        return value;
    };

    // Get translation for a given key
    const t = (key) => {
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

    const value = {
        language,
        setLanguage,
        t,
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

// Custom hook to use language context
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export default LanguageContext;
