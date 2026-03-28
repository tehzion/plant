/**
 * WooCommerce Integration Service
 * Fetches products from a WooCommerce store via REST API
 */

import NodeCache from 'node-cache';

// Cache products for 1 hour, tags & categories for 6 hours
const productCache = new NodeCache({ stdTTL: 3600 });
const tagCache = new NodeCache({ stdTTL: 21600 });
const categoryCache = new NodeCache({ stdTTL: 21600 });

const sanitizeProductDescription = (value = '') => String(value)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const transformWooProduct = (product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    regularPrice: product.regular_price,
    salePrice: product.sale_price,
    description: sanitizeProductDescription(product.short_description || product.description),
    image: product.images?.[0]?.src || null,
    permalink: product.permalink,
    cartUrl: `${process.env.WOOCOMMERCE_URL}/cart/?add-to-cart=${product.id}`,
    categories: product.categories?.map((category) => category.name) || [],
    categoryIds: product.categories?.map((category) => category.id) || [],
    tags: product.tags?.map((tag) => tag.name) || [],
    tagIds: product.tags?.map((tag) => tag.id) || [],
});

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

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
    });

    return url.toString();
};

/**
 * Fetch all WooCommerce product tags (cached, paginated)
 * @returns {Promise<Array>} Array of { id, name, count }
 */
export const getAllTags = async () => {
    const cacheKey = 'woo_all_tags';
    const cached = tagCache.get(cacheKey);
    if (cached) {
        console.log('🧠 WooCommerce tags cache HIT');
        return cached;
    }

    const config = getWooConfig();
    if (!config) return [];

    try {
        console.log('🏷️ Fetching all product tags from WooCommerce...');
        let allTags = [];
        let page = 1;

        while (true) {
            const apiUrl = buildApiUrl('products/tags', { per_page: 100, page });
            if (!apiUrl) break;

            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`WooCommerce Tags API error: ${response.status}`);
            }

            const tags = await response.json();
            if (!tags || tags.length === 0) break;

            allTags.push(...tags.map((tag) => ({
                id: tag.id,
                name: tag.name,
                count: tag.count,
            })));

            page += 1;
        }

        const usefulTags = allTags.filter((tag) => tag.count > 0);

        tagCache.set(cacheKey, usefulTags);
        console.log(`✅ Cached ${usefulTags.length} product tags from WooCommerce`);
        return usefulTags;
    } catch (error) {
        console.error('❌ WooCommerce tag fetch failed:', error.message);
        return [];
    }
};

/**
 * Fetch all WooCommerce product categories (cached, paginated)
 * @returns {Promise<Array>} Array of { id, name, count, parent }
 */
export const getAllCategories = async () => {
    const cacheKey = 'woo_all_categories';
    const cached = categoryCache.get(cacheKey);
    if (cached) {
        console.log('🧠 WooCommerce categories cache HIT');
        return cached;
    }

    const config = getWooConfig();
    if (!config) return [];

    try {
        console.log('📂 Fetching all product categories from WooCommerce...');
        let allCategories = [];
        let page = 1;

        while (true) {
            const apiUrl = buildApiUrl('products/categories', { per_page: 100, page });
            if (!apiUrl) break;

            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`WooCommerce Categories API error: ${response.status}`);
            }

            const categories = await response.json();
            if (!categories || categories.length === 0) break;

            allCategories.push(...categories.map((category) => ({
                id: category.id,
                name: category.name,
                count: category.count,
                parent: category.parent,
            })));

            page += 1;
        }

        const usefulCategories = allCategories.filter((category) => category.count > 0);

        categoryCache.set(cacheKey, usefulCategories);
        console.log(`✅ Cached ${usefulCategories.length} product categories from WooCommerce`);
        return usefulCategories;
    } catch (error) {
        console.error('❌ WooCommerce category fetch failed:', error.message);
        return [];
    }
};

/**
 * Fetch all products from WooCommerce (cached, paginated)
 * @returns {Promise<Array>} Array of products
 */
export const getAllProducts = async () => {
    const cacheKey = 'woo_all_products';
    const cached = productCache.get(cacheKey);
    if (cached) {
        console.log('🧠 WooCommerce products cache HIT');
        return cached;
    }

    try {
        console.log('🛒 Fetching products from WooCommerce...');
        let allProducts = [];
        let page = 1;

        while (true) {
            const apiUrl = buildApiUrl('products', { per_page: 100, status: 'publish', page });
            if (!apiUrl) break;

            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`WooCommerce API error: ${response.status}`);
            }

            const products = await response.json();
            if (!products || products.length === 0) break;

            allProducts.push(...products.map(transformWooProduct));
            page += 1;
        }

        productCache.set(cacheKey, allProducts);
        console.log(`✅ Cached ${allProducts.length} products from WooCommerce`);

        return allProducts;
    } catch (error) {
        console.error('❌ WooCommerce fetch failed:', error.message);
        return [];
    }
};

/**
 * Get products matching specific WooCommerce tag IDs and/or category IDs
 * @param {Array<number>} tagIds - Array of WooCommerce tag IDs
 * @param {Array<number>} categoryIds - Optional array of WooCommerce category IDs
 * @returns {Promise<Array>} Matching products sorted by relevance
 */
export const getProductsByTagIds = async (tagIds, categoryIds = []) => {
    const hasTagIds = tagIds && Array.isArray(tagIds) && tagIds.length > 0;
    const hasCatIds = categoryIds && Array.isArray(categoryIds) && categoryIds.length > 0;
    if (!hasTagIds && !hasCatIds) return [];

    const allProducts = await getAllProducts();
    const tagIdSet = new Set(tagIds || []);
    const catIdSet = new Set(categoryIds || []);

    const scoredProducts = allProducts.map((product) => {
        let score = 0;
        product.tagIds.forEach((tagId) => {
            if (tagIdSet.has(tagId)) score += 2;
        });
        product.categoryIds.forEach((categoryId) => {
            if (catIdSet.has(categoryId)) score += 1;
        });
        return { product, score };
    });

    return scoredProducts
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)
        .map((entry) => entry.product)
        .slice(0, 10);
};

export const getStoreUrl = () => {
    const config = getWooConfig();
    return config ? config.url : null;
};

/**
 * Check if WooCommerce is configured
 */
export const isWooCommerceEnabled = () => {
    return !!getWooConfig();
};
