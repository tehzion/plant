/**
 * WooCommerce Integration Service
 * Fetches products from a WooCommerce store via REST API
 */

import NodeCache from 'node-cache';

// Cache products for 1 hour, tags & categories for 6 hours
const productCache = new NodeCache({ stdTTL: 3600 });
const tagCache = new NodeCache({ stdTTL: 21600 });
const categoryCache = new NodeCache({ stdTTL: 21600 });

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

            allTags.push(...tags.map(t => ({
                id: t.id,
                name: t.name,
                count: t.count
            })));

            page++;
        }

        // Filter out empty tags (count = 0)
        const usefulTags = allTags.filter(t => t.count > 0);

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

            allCategories.push(...categories.map(c => ({
                id: c.id,
                name: c.name,
                count: c.count,
                parent: c.parent
            })));

            page++;
        }

        const usefulCategories = allCategories.filter(c => c.count > 0);

        categoryCache.set(cacheKey, usefulCategories);
        console.log(`✅ Cached ${usefulCategories.length} product categories from WooCommerce`);
        return usefulCategories;
    } catch (error) {
        console.error('❌ WooCommerce category fetch failed:', error.message);
        return [];
    }
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
            categoryIds: p.categories?.map(c => c.id) || [],
            tags: p.tags?.map(t => t.name) || [],
            tagIds: p.tags?.map(t => t.id) || []
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

    const scoredProducts = allProducts.map(product => {
        let score = 0;
        product.tagIds.forEach(tid => {
            if (tagIdSet.has(tid)) score += 2; // Tag match weighted higher
        });
        product.categoryIds.forEach(cid => {
            if (catIdSet.has(cid)) score += 1; // Category match
        });
        return { product, score };
    });

    return scoredProducts
        .filter(p => p.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(p => p.product)
        .slice(0, 10);
};

/**
 * Check if WooCommerce is configured
 */
export const isWooCommerceEnabled = () => {
    return !!getWooConfig();
};
