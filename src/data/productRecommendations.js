/**
 * Product Recommendations Database
 * This file contains data for agriculture products and suppliers.
 */

export const suppliers = {
    guanChongAgro: {
        name: "Guan Chong Agro",
        description: "results.guanChongDesc",
        address: "75200 Melaka, Malaysia",
        phone: "+60 6-335 1234",
        email: "contact@guanchongagro.com"
    },
    tanAgro: {
        name: "Tan Agro",
        description: "results.tanAgroDesc",
        address: "81100 Johor Bahru, Johor, Malaysia",
        phone: "+60 7-355 5678 / +60 12-789 4321",
        whatsapp: "+60127894321",
        email: "sales@tanagro.com.my"
    }
};

/**
 * Returns products based on plant type and detected disease.
 * @param {string} plantType 
 * @param {string} disease 
 * @returns {object} { diseaseControl: [], nutrition: [] }
 */
export const getProductRecommendations = (plantType, disease) => {
    // Ensure disease is a string to prevent crashes on .toLowerCase()
    const diseaseSafe = typeof disease === 'string' ? disease : '';
    const isHealthy = !diseaseSafe || diseaseSafe.toLowerCase().includes('healthy') || diseaseSafe.toLowerCase().includes('normal');

    // Default recommendations for all plants
    const defaultNutrition = [
        {
            name: "N-P-K 15-15-15 Dashboard Fertilizer",
            count: "50kg",
            description: "Balanced fertilizer for general growth and maintenance of all plant types.",
            supplier: "both",
            guanChongUrl: "https://www.guanchongagro.com/category/",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        },
        {
            name: "Humax Liquid Bio-Stimulant",
            count: "1L",
            description: "Enhances root development and nutrient uptake efficiency.",
            supplier: "guanChong",
            guanChongUrl: "https://www.guanchongagro.com/category/"
        }
    ];

    const recommendations = {
        diseaseControl: [],
        nutrition: [...defaultNutrition]
    };

    if (isHealthy) {
        return recommendations;
    }

    // Specific disease control products
    const diseaseLower = diseaseSafe.toLowerCase();

    // Check for abiotic/environmental issues where fungicides are NOT recommended
    const isAbiotic = diseaseLower.includes('sun') ||
        diseaseLower.includes('scorch') ||
        diseaseLower.includes('water') ||
        diseaseLower.includes('stress') ||
        diseaseLower.includes('dry') ||
        diseaseLower.includes('burn') ||
        diseaseLower.includes('physiological') ||
        diseaseLower.includes('weather') ||
        diseaseLower.includes('heat') ||
        diseaseLower.includes('cold') ||
        diseaseLower.includes('edema');

    if (diseaseLower.includes('blast') || diseaseLower.includes('mold') || diseaseLower.includes('mildew')) {
        recommendations.diseaseControl.push({
            name: "Azoxystrobin + Difenoconazole 325SC",
            count: "250ml",
            description: "Broad-spectrum systemic fungicide for blast, sheath blight, and mildews.",
            supplier: "tanAgro",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        });
    } else if (diseaseLower.includes('bacteria') || diseaseLower.includes('wilt') || diseaseLower.includes('canker') || diseaseLower.includes('rot')) {
        recommendations.diseaseControl.push({
            name: "Copper Hydroxide 77WP",
            count: "500g",
            description: "Bactericide/Fungicide for bacterial spots, cankers, and wilts.",
            supplier: "guanChong",
            guanChongUrl: "https://www.guanchongagro.com/category/"
        });
    } else if (diseaseLower.includes('rust') || diseaseLower.includes('spot') || diseaseLower.includes('anthracnose')) {
        recommendations.diseaseControl.push({
            name: "Mancozeb 80WP Fungicide",
            count: "1kg",
            description: "Contact fungicide for leaf spots, rusts, and anthracnose.",
            supplier: "both",
            guanChongUrl: "https://www.guanchongagro.com/category/",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        });
    } else if (diseaseLower.includes('insect') || diseaseLower.includes('bug') || diseaseLower.includes('mite') || diseaseLower.includes('thrip') || diseaseLower.includes('worm') || diseaseLower.includes('larva') || diseaseLower.includes('fly') || diseaseLower.includes('beetle')) {
        recommendations.diseaseControl.push({
            name: "Abamectin 1.8EC Insecticide",
            count: "500ml",
            description: "Effective insecticide/miticide for mites, leaf miners, and thrips.",
            supplier: "guanChong",
            guanChongUrl: "https://www.guanchongagro.com/category/"
        });
        recommendations.diseaseControl.push({
            name: "Cypermethrin 5.5EC Insecticide",
            count: "1L",
            description: "Broad-spectrum contact insecticide for beetles, caterpillars, and general pests.",
            supplier: "tanAgro",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        });
    } else if (diseaseLower.includes('virus') || diseaseLower.includes('mosaic')) {
        recommendations.diseaseControl.push({
            name: "Imidacloprid 18.3SL",
            count: "250ml",
            description: "Controls aphids and whiteflies (vectors) that transmit viral diseases.",
            supplier: "both",
            guanChongUrl: "https://www.guanchongagro.com/category/",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        });
    }

    // Add generic disease control if still empty for a diseased plant (ONLY if not abiotic)
    if (recommendations.diseaseControl.length === 0 && !isAbiotic) {
        recommendations.diseaseControl.push({
            name: "Chlorothalonil 500SC",
            count: "1L",
            description: "Broad-spectrum preventive fungicide for common fungal diseases.",
            supplier: "both",
            guanChongUrl: "https://www.guanchongagro.com/category/",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        });
    }

    return recommendations;
};
