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
 * @returns {object} { diseaseControl: [], fertilizers: [], supplements: [] }
 */
export const getProductRecommendations = (plantType, disease) => {
    // Ensure disease is a string to prevent crashes on .toLowerCase()
    const diseaseSafe = typeof disease === 'string' ? disease : '';
    const isHealthy = !diseaseSafe || diseaseSafe.toLowerCase().includes('healthy') || diseaseSafe.toLowerCase().includes('normal');

    // Default recommendations for all plants (Expanded to ensure variety)
    const defaultNutrition = [
        {
            name: "results.prodNPKName",
            count: "50kg",
            description: "results.prodNPKDesc",
            supplier: "both",
            guanChongUrl: "https://www.guanchongagro.com/category/",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        },
        {
            name: "results.prodHumaxName",
            count: "1L",
            description: "results.prodHumaxDesc",
            supplier: "guanChong",
            guanChongUrl: "https://www.guanchongagro.com/category/"
        },
        {
            name: "results.prodSeaweedName", // Added for more variety
            count: "1L",
            description: "results.prodSeaweedDesc",
            supplier: "tanAgro",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        },
        {
            name: "results.prodOrganicName", // Added for more variety
            count: "25kg",
            description: "results.prodOrganicDesc",
            supplier: "both",
            guanChongUrl: "https://www.guanchongagro.com/category/",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        },
        {
            name: "results.prodTraceName", // Added for more variety
            count: "500g",
            description: "results.prodTraceDesc",
            supplier: "guanChong",
            guanChongUrl: "https://www.guanchongagro.com/category/"
        }
    ];

    const recommendations = {
        diseaseControl: [],
        fertilizers: [...defaultNutrition],
        supplements: [],
    };

    if (isHealthy) {
        // Ensure healthy plants have a complete growth-and-maintenance product mix
        recommendations.fertilizers = defaultNutrition.slice(0, 3);
        recommendations.supplements = defaultNutrition.slice(3, 5);
        recommendations.nutrition = [...recommendations.fertilizers, ...recommendations.supplements];
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
            name: "results.prodAzoxyName",
            count: "250ml",
            description: "results.prodAzoxyDesc",
            supplier: "tanAgro",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        });
    } else if (diseaseLower.includes('bacteria') || diseaseLower.includes('wilt') || diseaseLower.includes('canker') || diseaseLower.includes('rot')) {
        recommendations.diseaseControl.push({
            name: "results.prodCopperName",
            count: "500g",
            description: "results.prodCopperDesc",
            supplier: "guanChong",
            guanChongUrl: "https://www.guanchongagro.com/category/"
        });
    } else if (diseaseLower.includes('rust') || diseaseLower.includes('spot') || diseaseLower.includes('anthracnose')) {
        recommendations.diseaseControl.push({
            name: "results.prodMancozebName",
            count: "1kg",
            description: "results.prodMancozebDesc",
            supplier: "both",
            guanChongUrl: "https://www.guanchongagro.com/category/",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        });
    } else if (diseaseLower.includes('insect') || diseaseLower.includes('bug') || diseaseLower.includes('mite') || diseaseLower.includes('thrip') || diseaseLower.includes('worm') || diseaseLower.includes('larva') || diseaseLower.includes('fly') || diseaseLower.includes('beetle')) {
        recommendations.diseaseControl.push({
            name: "results.prodAbamectinName",
            count: "500ml",
            description: "results.prodAbamectinDesc",
            supplier: "guanChong",
            guanChongUrl: "https://www.guanchongagro.com/category/"
        });
        recommendations.diseaseControl.push({
            name: "results.prodCyperName",
            count: "1L",
            description: "results.prodCyperDesc",
            supplier: "tanAgro",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        });
    } else if (diseaseLower.includes('virus') || diseaseLower.includes('mosaic')) {
        recommendations.diseaseControl.push({
            name: "results.prodImidacName",
            count: "250ml",
            description: "results.prodImidacDesc",
            supplier: "both",
            guanChongUrl: "https://www.guanchongagro.com/category/",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        });
    }

    // Add generic disease control if still empty for a diseased plant (ONLY if not abiotic)
    if (recommendations.diseaseControl.length === 0 && !isAbiotic) {
        recommendations.diseaseControl.push({
            name: "results.prodChloroName",
            count: "1L",
            description: "results.prodChloroDesc",
            supplier: "both",
            guanChongUrl: "https://www.guanchongagro.com/category/",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        });
    }

    // Ensure total is 5 by balancing fertilizer and supplement recommendations
    const targetTotal = 5;
    const diseaseCount = recommendations.diseaseControl.length;
    const nutritionNeeded = targetTotal - diseaseCount;

    const balancedNutrition = defaultNutrition.slice(0, Math.max(0, nutritionNeeded));
    recommendations.fertilizers = balancedNutrition.slice(0, Math.min(3, balancedNutrition.length));
    recommendations.supplements = balancedNutrition.slice(recommendations.fertilizers.length);
    recommendations.nutrition = balancedNutrition;

    return recommendations;
};
