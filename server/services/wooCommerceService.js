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
 * Build WooCommerce API URL and Headers
 */
const getWooRequestConfig = (endpoint, params = {}, method = 'GET') => {
    const config = getWooConfig();
    if (!config) return null;

    const url = new URL(`${config.url}/wp-json/wc/v3/${endpoint}`);

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.append(key, value);
        }
    });

    const headers = {
        'Content-Type': 'application/json',
    };

    const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${auth}`;

    return { url: url.toString(), headers };
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
            const req = getWooRequestConfig('products/tags', { per_page: 100, page });
            if (!req) break;

            const response = await fetch(req.url, { headers: req.headers });
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
            const req = getWooRequestConfig('products/categories', { per_page: 100, page });
            if (!req) break;

            const response = await fetch(req.url, { headers: req.headers });
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
            const req = getWooRequestConfig('products', { per_page: 100, status: 'publish', page });
            if (!req) break;

            const response = await fetch(req.url, { headers: req.headers });
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

/**
 * Create a new Guest Order in WooCommerce
 * @param {Object} orderData - Order details (items, billing, guestId)
 */
export const createOrder = async (orderData) => {
    const config = getWooConfig();
    if (!config) return null;

    try {
        const { items, billing, shipping, guestId } = orderData;

        if (!items || items.length === 0) throw new Error('Order must contain items');

        const payload = {
            payment_method: 'bacs',
            payment_method_title: 'Direct Bank Transfer',
            set_paid: false,
            billing: billing || {},
            shipping: shipping || billing || {},
            line_items: items.map(item => ({
                product_id: item.productId,
                quantity: item.quantity
            })),
            meta_data: [
                {
                    key: '_antigravity_app_id',
                    value: guestId || 'anonymous'
                }
            ]
        };

        const req = getWooRequestConfig('orders', {}, 'POST');
        console.log(`📦 Creating WooCommerce order for guest: ${guestId}...`);
        
        const response = await fetch(req.url, {
            method: 'POST',
            headers: req.headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ Order #${data.id} created successfully.`);
        return data;
    } catch (error) {
        console.error('❌ WooCommerce order creation failed:', error.message);
        throw error;
    }
};

/**
 * Fetch orders by specific IDs
 * This is more reliable for guests who track their orders locally
 * @param {Array<number|string>} ids - Array of order IDs
 */
export const getOrdersByIds = async (ids) => {
    if (!ids || !Array.isArray(ids) || ids.length === 0) return [];

    try {
        // WooCommerce 'include' param handles multiple IDs
        const req = getWooRequestConfig('orders', { include: ids.join(',') });
        const response = await fetch(req.url, { headers: req.headers });
        if (!response.ok) return [];
        
        return await response.json();
    } catch (error) {
        console.error('❌ WooCommerce multiple orders fetch failed:', error.message);
        return [];
    }
};

/**
 * Fetch orders for a specific App Instance ID (fallback/audit method)
 * @param {string} appId - The unique ID from the app's localStorage
 */
export const getOrdersByAppId = async (appId) => {
    if (!appId) return [];

    try {
        let matchingOrders = [];
        let page = 1;
        const maxPages = 3; // Check last 300 orders (reasonable for guest history)

        while (page <= maxPages) {
            const req = getWooRequestConfig('orders', { per_page: 100, page });
            if (!req) break;

            const response = await fetch(req.url, { headers: req.headers });
            if (!response.ok) break;
            
            const orders = await response.json();
            if (!orders || orders.length === 0) break;

            const found = orders.filter(order => 
                order.meta_data && order.meta_data.some(meta => meta.key === '_antigravity_app_id' && meta.value === appId)
            );

            matchingOrders.push(...found);
            
            // If we found some, or if this page wasn't full, we might be done
            // But usually we continue to get ALL history for this guest
            if (orders.length < 100) break;
            page += 1;
        }

        return matchingOrders;
    } catch (error) {
        console.error('❌ WooCommerce order fetch failed:', error.message);
        return [];
    }
};

/**
 * Get single order status
 */
export const getOrderStatus = async (orderId) => {
    try {
        const req = getWooRequestConfig(`orders/${orderId}`);
        const response = await fetch(req.url, { headers: req.headers });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        return null;
    }
};
