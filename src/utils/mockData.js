import { diseaseDatabase } from '../data/diseaseDatabase';
import { getProductRecommendations } from '../data/productRecommendations';

/**
 * Generates a realistic mock analysis result for demo/fallback purposes.
 */
export const getMockAnalysisResult = async (treeImageBase64, category, language) => {
    // Simulate a short delay for realism
    await new Promise(resolve => setTimeout(resolve, 800));

    // Get random disease from database
    const randomDisease = diseaseDatabase[Math.floor(Math.random() * diseaseDatabase.length)];

    // Get product recommendations
    const recommendations = getProductRecommendations(category || 'General', randomDisease.id);

    // Deterministic Confidence Score (Simulation)
    const imageHash = (treeImageBase64?.length || 0) + (treeImageBase64?.substring(0, 100)?.split('').reduce((a, b) => a + b.charCodeAt(0), 0) || 0);
    const outputScore = 0.85 + ((imageHash % 140) / 1000); // Maps to 0.85 - 0.99 range

    // Map health status and severity consistently (Standardized for robustness)
    const healthStatus = 'unhealthy';
    const severity = 'moderate';

    // Construct a realistic response object matching the API format
    return {
        id: Date.now().toString(),
        disease: language === 'zh' ? (randomDisease.name?.zh || randomDisease.name?.en || '未知病害') : (language === 'ms' ? (randomDisease.name?.ms || randomDisease.name?.en || 'Penyakit Tidak Diketahui') : (randomDisease.name?.en || 'Unknown Disease')),
        fungusType: language === 'zh' ? (randomDisease.pathogen?.zh || randomDisease.pathogen?.en || '未知病原体') : (language === 'ms' ? (randomDisease.pathogen?.ms || randomDisease.pathogen?.en || 'Patogen Tidak Diketahui') : (randomDisease.pathogen?.en || 'Unknown Pathogen')),
        pathogenType: language === 'zh' ? '真菌/昆虫' : (language === 'ms' ? 'Kulat/Serangga' : 'Fungal/Insect'),
        confidence: outputScore.toFixed(2),
        severity: severity,
        symptoms: language === 'zh' ? (randomDisease.symptoms?.zh ? [randomDisease.symptoms.zh] : []) : (language === 'ms' ? (randomDisease.symptoms?.ms ? [randomDisease.symptoms.ms] : []) : (randomDisease.symptoms?.en ? [randomDisease.symptoms.en] : [])),
        causes: language === 'zh' ? (randomDisease.causes?.zh ? [randomDisease.causes.zh] : []) : (language === 'ms' ? (randomDisease.causes?.ms ? [randomDisease.causes.ms] : []) : (randomDisease.causes?.en ? [randomDisease.causes.en] : [])),
        treatments: language === 'zh' ? (randomDisease.treatment?.zh || []) : (language === 'ms' ? (randomDisease.treatment?.ms || []) : (randomDisease.treatment?.en || [])),
        prevention: language === 'zh' ? (randomDisease.prevention?.zh || []) : (language === 'ms' ? (randomDisease.prevention?.ms || []) : (randomDisease.prevention?.en || [])),
        plantType: category || 'General',
        healthStatus: healthStatus,
        productRecommendations: recommendations,
        description: language === 'zh' ? (randomDisease.causes?.zh || '') : (language === 'ms' ? (randomDisease.causes?.ms || '') : (randomDisease.causes?.en || '')),
        additionalNotes: language === 'zh' ? '演示模式 / 模拟数据' : (language === 'ms' ? 'Mod Demo / Data Simulasi' : 'Demo Mode / Simulated Data'),
        healthyCarePlan: {
            dailyCare: language === 'zh' ? ["检查土壤湿度", "监测病虫害"] : (language === 'ms' ? ["Periksa kelembapan tanah", "Pantau perosak"] : ["Check soil moisture", "Monitor for pests"]),
            weeklyCare: language === 'zh' ? ["清除枯叶"] : (language === 'ms' ? ["Buang daun mati"] : ["Remove dead leaves"]),
            monthlyCare: language === 'zh' ? ["施用轻量肥料"] : (language === 'ms' ? ["Baja ringan"] : ["Light fertilizer"]),
            bestPractices: language === 'zh' ? ["确保排水良好"] : (language === 'ms' ? ["Pastikan saliran baik"] : ["Ensure good drainage"])
        },
        image: treeImageBase64
    };
};
