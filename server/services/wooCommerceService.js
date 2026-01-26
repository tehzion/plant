/**
 * WooCommerce Integration Service
 * Fetches products from a WooCommerce store via REST API
 */

import NodeCache from 'node-cache';

// Cache products for 1 hour to reduce API calls
const productCache = new NodeCache({ stdTTL: 3600 });

/**
 * Get WooCommerce API credentials from environment
 */
const getWooConfig = () => {
    const url = process.env.WOOCOMMERCE_URL;
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!url || !consumerKey || !consumerSecret) {
        console.warn('⚠️ WooCommerce credentials not configured. Product sync disabled.');
        return null;
    }

    return { url, consumerKey, consumerSecret };
};

/**
 * Build WooCommerce API URL with authentication
 */
const buildApiUrl = (endpoint, params = {}) => {
    const config = getWooConfig();
    if (!config) return null;

    const url = new URL(`${config.url}/wp-json/wc/v3/${endpoint}`);
    url.searchParams.append('consumer_key', config.consumerKey);
    url.searchParams.append('consumer_secret', config.consumerSecret);

    // Add additional params
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
    });

    return url.toString();
};

/**
 * Fetch all products from WooCommerce (cached)
 * @returns {Promise<Array>} Array of products
 */
export const getAllProducts = async () => {
    const cacheKey = 'woo_all_products';
    const cached = productCache.get(cacheKey);
    if (cached) {
        console.log('🧠 WooCommerce products cache HIT');
        return cached;
    }

    const apiUrl = buildApiUrl('products', { per_page: 100, status: 'publish' });
    if (!apiUrl) return [];

    try {
        console.log('🛒 Fetching products from WooCommerce...');
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`WooCommerce API error: ${response.status}`);
        }

        const products = await response.json();

        // Transform to simpler format
        const transformedProducts = products.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            regularPrice: p.regular_price,
            salePrice: p.sale_price,
            description: p.short_description || p.description,
            image: p.images?.[0]?.src || null,
            permalink: p.permalink,
            cartUrl: `${process.env.WOOCOMMERCE_URL}/cart/?add-to-cart=${p.id}`,
            categories: p.categories?.map(c => c.name) || [],
            tags: p.tags?.map(t => t.name) || []
        }));

        productCache.set(cacheKey, transformedProducts);
        console.log(`✅ Cached ${transformedProducts.length} products from WooCommerce`);

        return transformedProducts;
    } catch (error) {
        console.error('❌ WooCommerce fetch failed:', error.message);
        return [];
    }
};

/**
 * Search products by keyword
 * @param {string} keyword - Search term
 * @returns {Promise<Array>} Matching products
 */
export const searchProducts = async (keyword) => {
    const allProducts = await getAllProducts();
    const searchTerm = keyword.toLowerCase();

    return allProducts.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
        p.categories.some(cat => cat.toLowerCase().includes(searchTerm))
    );
};

/**
 * Get products matching disease-related keywords
 * @param {string} disease - Disease name
 * @param {string} healthStatus - 'healthy' or 'unhealthy'
 * @returns {Promise<Object>} { diseaseControl: [], nutrition: [] }
 */
export const getProductsForDisease = async (disease, healthStatus) => {
    const allProducts = await getAllProducts();
    const diseaseLower = (disease || '').toLowerCase();
    const isHealthy = healthStatus?.toLowerCase() === 'healthy';

    const result = {
        diseaseControl: [],
        nutrition: []
    };

    // Define keyword mappings
    const diseaseKeywords = {
        fungal: ['fungicide', 'copper', 'mancozeb', 'azoxystrobin'],
        bacterial: ['copper', 'bactericide', 'streptomycin'],
        pest: ['insecticide', 'pesticide', 'abamectin', 'cypermethrin'],
        virus: ['imidacloprid', 'insecticide'], // Control vectors
        rust: ['fungicide', 'mancozeb', 'rust'],
        mildew: ['fungicide', 'sulfur', 'mildew'],
        blast: ['fungicide', 'tricyclazole', 'blast'],
        rot: ['fungicide', 'copper', 'rot'],
        wilt: ['fungicide', 'copper', 'wilt']
    };

    const nutritionKeywords = ['fertilizer', 'npk', 'organic', 'humic', 'nutrient', 'growth'];

    // Find disease control products
    if (!isHealthy) {
        for (const [condition, keywords] of Object.entries(diseaseKeywords)) {
            if (diseaseLower.includes(condition)) {
                const matches = allProducts.filter(p =>
                    keywords.some(kw =>
                        p.name.toLowerCase().includes(kw) ||
                        p.tags.some(t => t.toLowerCase().includes(kw))
                    )
                );
                result.diseaseControl.push(...matches);
            }
        }

        // Remove duplicates
        result.diseaseControl = [...new Map(result.diseaseControl.map(p => [p.id, p])).values()];
    }

    // Find nutrition products (always include)
    result.nutrition = allProducts.filter(p =>
        nutritionKeywords.some(kw =>
            p.name.toLowerCase().includes(kw) ||
            p.tags.some(t => t.toLowerCase().includes(kw)) ||
            p.categories.some(c => c.toLowerCase().includes(kw))
        )
    );

    // Limit results
    result.diseaseControl = result.diseaseControl.slice(0, 4);
    result.nutrition = result.nutrition.slice(0, 4);

    return result;
};

/**
 * Check if WooCommerce is configured
 */
export const isWooCommerceEnabled = () => {
    return !!getWooConfig();
};
