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

    // Default recommendations for all plants (Expanded with prices and IDs)
    const defaultNutrition = [
        {
            id: 'local-npk-15',
            name: "results.prodNPKName",
            count: "50kg",
            price: "168.00",
            description: "results.prodNPKDesc",
            supplier: "both",
            guanChongUrl: "https://www.guanchongagro.com/category/",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        },
        {
            id: 'local-humax-1l',
            name: "results.prodHumaxName",
            count: "1L",
            price: "45.00",
            description: "results.prodHumaxDesc",
            supplier: "guanChong",
            guanChongUrl: "https://www.guanchongagro.com/category/"
        },
        {
            id: 'local-seaweed-1l',
            name: "results.prodSeaweedName",
            count: "1L",
            price: "38.50",
            description: "results.prodSeaweedDesc",
            supplier: "tanAgro",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        },
        {
            id: 'local-organic-25kg',
            name: "results.prodOrganicName",
            count: "25kg",
            price: "24.00",
            description: "results.prodOrganicDesc",
            supplier: "both",
            guanChongUrl: "https://www.guanchongagro.com/category/",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        },
        {
            id: 'local-trace-500g',
            name: "results.prodTraceName",
            count: "500g",
            price: "19.50",
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
            id: 'local-azoxy-250',
            name: "results.prodAzoxyName",
            count: "250ml",
            price: "58.00",
            description: "results.prodAzoxyDesc",
            supplier: "tanAgro",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        });
    } else if (diseaseLower.includes('bacteria') || diseaseLower.includes('wilt') || diseaseLower.includes('canker') || diseaseLower.includes('rot')) {
        recommendations.diseaseControl.push({
            id: 'local-copper-500',
            name: "results.prodCopperName",
            count: "500g",
            price: "24.50",
            description: "results.prodCopperDesc",
            supplier: "guanChong",
            guanChongUrl: "https://www.guanchongagro.com/category/"
        });
    } else if (diseaseLower.includes('rust') || diseaseLower.includes('spot') || diseaseLower.includes('anthracnose')) {
        recommendations.diseaseControl.push({
            id: 'local-manco-1kg',
            name: "results.prodMancozebName",
            count: "1kg",
            price: "32.00",
            description: "results.prodMancozebDesc",
            supplier: "both",
            guanChongUrl: "https://www.guanchongagro.com/category/",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        });
    } else if (diseaseLower.includes('insect') || diseaseLower.includes('bug') || diseaseLower.includes('mite') || diseaseLower.includes('thrip') || diseaseLower.includes('worm') || diseaseLower.includes('larva') || diseaseLower.includes('fly') || diseaseLower.includes('beetle')) {
        recommendations.diseaseControl.push({
            id: 'local-aba-500',
            name: "results.prodAbamectinName",
            count: "500ml",
            price: "46.00",
            description: "results.prodAbamectinDesc",
            supplier: "guanChong",
            guanChongUrl: "https://www.guanchongagro.com/category/"
        });
        recommendations.diseaseControl.push({
            id: 'local-cyper-1l',
            name: "results.prodCyperName",
            count: "1L",
            price: "28.00",
            description: "results.prodCyperDesc",
            supplier: "tanAgro",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        });
    } else if (diseaseLower.includes('virus') || diseaseLower.includes('mosaic')) {
        recommendations.diseaseControl.push({
            id: 'local-imi-250',
            name: "results.prodImidacName",
            count: "250ml",
            price: "35.00",
            description: "results.prodImidacDesc",
            supplier: "both",
            guanChongUrl: "https://www.guanchongagro.com/category/",
            tanAgroUrl: "https://www.tanagro.com.my/category/"
        });
    }

    // Add generic disease control if still empty for a diseased plant (ONLY if not abiotic)
    if (recommendations.diseaseControl.length === 0 && !isAbiotic) {
        recommendations.diseaseControl.push({
            id: 'local-chloro-1l',
            name: "results.prodChloroName",
            count: "1L",
            price: "42.00",
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
