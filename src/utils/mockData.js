import { diseaseDatabase } from '../data/diseaseDatabase';
import { getProductRecommendations } from '../data/productRecommendations';
import { translations } from '../i18n/translations';

const getMockTranslation = (language, key) => {
    const keys = key.split('.');
    let value = translations?.[language] ?? translations.en;

    for (const part of keys) {
        value = value?.[part];
    }

    if (value == null && language !== 'en') {
        return getMockTranslation('en', key);
    }

    return value;
};

const getLocalizedDiseaseText = (value, language, fallbackKey) => {
    if (value?.[language]) return value[language];
    if (value?.en) return value.en;
    return getMockTranslation(language, fallbackKey);
};

const getLocalizedDiseaseList = (value, language) => {
    const localizedValue = value?.[language] ?? value?.en;
    if (Array.isArray(localizedValue)) return localizedValue.filter(Boolean);
    return localizedValue ? [localizedValue] : [];
};

/**
 * Generates a realistic mock analysis result for demo/fallback purposes.
 */
export const getMockAnalysisResult = async (treeImageBase64, category, language = 'en') => {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const randomDisease = diseaseDatabase[Math.floor(Math.random() * diseaseDatabase.length)];
    const recommendations = getProductRecommendations(category || 'General', randomDisease.id);

    const imageHash = (treeImageBase64?.length || 0)
        + (treeImageBase64?.substring(0, 100)?.split('').reduce((total, char) => total + char.charCodeAt(0), 0) || 0);
    const outputScore = 0.85 + ((imageHash % 140) / 1000);

    return {
        id: Date.now().toString(),
        disease: getLocalizedDiseaseText(randomDisease.name, language, 'results.unknownDisease'),
        fungusType: getLocalizedDiseaseText(randomDisease.pathogen, language, 'results.unknownPathogen'),
        pathogenType: getMockTranslation(language, 'results.mockPathogenType'),
        confidence: outputScore.toFixed(2),
        severity: 'moderate',
        symptoms: getLocalizedDiseaseList(randomDisease.symptoms, language),
        causes: getLocalizedDiseaseList(randomDisease.causes, language),
        treatments: getLocalizedDiseaseList(randomDisease.treatment, language),
        prevention: getLocalizedDiseaseList(randomDisease.prevention, language),
        plantType: category || 'General',
        healthStatus: 'unhealthy',
        productRecommendations: recommendations,
        description: getLocalizedDiseaseText(randomDisease.causes, language, 'common.unknown'),
        additionalNotes: getMockTranslation(language, 'results.mockAdditionalNotes'),
        healthyCarePlan: {
            dailyCare: getMockTranslation(language, 'results.mockDailyCareItems'),
            weeklyCare: getMockTranslation(language, 'results.mockWeeklyCareItems'),
            monthlyCare: getMockTranslation(language, 'results.mockMonthlyCareItems'),
            bestPractices: getMockTranslation(language, 'results.mockBestPracticesItems'),
        },
        image: treeImageBase64,
    };
};
