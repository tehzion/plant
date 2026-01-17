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

    // Get translation for a given key
    const t = (key) => {
        const keys = key.split('.');
        let value = translations[language];

        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) {
                // Fallback to English if translation not found
                value = translations.en;
                for (const k2 of keys) {
                    value = value?.[k2];
                    if (value === undefined) {
                        console.warn(`Translation missing for key: ${key}`);
                        return key;
                    }
                }
                break;
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
