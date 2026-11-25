/**
 * WooCommerce Integration Service
 * Fetches products from a WooCommerce store via REST API
 */

import NodeCache from 'node-cache';
import { withAbortableTimeout } from '../utils/requestTimeout.js';
import { createCatalogCache } from '../utils/catalogCache.js';

// Filtered product searches are cached for 1 hour. The full product, tag and
// category lists use the catalogue cache below.
const productCache = new NodeCache({ stdTTL: 3600 });
const WOO_REQUEST_TIMEOUT_MS = Number(process.env.WOO_REQUEST_TIMEOUT_MS) || 15000;
const WOO_MAX_CATALOG_PAGES = Number(process.env.WOO_MAX_CATALOG_PAGES) || 20;

// WooCommerce returns names and descriptions with HTML character codes
// (e.g. "&#8211;" for a dash). The app shows them as plain text, so they
// are decoded once here.
const NAMED_ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
    times: '×', deg: '°', reg: '®', trade: '™', copy: '©',
};
const fromCodePoint = (code) => (Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '');
export const decodeHtmlEntities = (value = '') => String(value ?? '')
    .replace(/&#(\d+);/g, (_, code) => fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match);

const sanitizeProductDescription = (value = '') => decodeHtmlEntities(String(value)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

const storePrice = (value, minorUnit) => value == null || value === '' ? '' : (Number(value) / (10 ** (Number.isInteger(minorUnit) ? minorUnit : 2))).toFixed(Number.isInteger(minorUnit) ? minorUnit : 2);
const transformWooProduct = (product) => ({
    id: product.id,
    name: decodeHtmlEntities(product.name),
    price: product.price ?? storePrice(product.prices?.price, product.prices?.currency_minor_unit),
    regularPrice: product.regular_price ?? storePrice(product.prices?.regular_price, product.prices?.currency_minor_unit),
    salePrice: product.sale_price ?? storePrice(product.prices?.sale_price, product.prices?.currency_minor_unit),
    description: sanitizeProductDescription(product.short_description || product.description),
    image: product.images?.[0]?.src || null,
    permalink: product.permalink,
    cartUrl: `${process.env.WOOCOMMERCE_URL}/cart/?add-to-cart=${product.id}`,
    categories: product.categories?.map((category) => decodeHtmlEntities(category.name)) || [],
    categoryIds: product.categories?.map((category) => category.id) || [],
    tags: product.tags?.map((tag) => decodeHtmlEntities(tag.name)) || [],
    tagIds: product.tags?.map((tag) => tag.id) || [],
    stockStatus: product.stock_status || (product.is_in_stock === true ? 'instock' : product.is_in_stock === false ? 'outofstock' : null),
    availability: product.is_in_stock === true ? 'in_stock' : product.is_in_stock === false ? 'out_of_stock' : product.stock_status === 'instock'
        ? 'in_stock'
        : product.stock_status === 'outofstock'
            ? 'out_of_stock'
            : product.stock_status === 'onbackorder'
                ? 'on_backorder'
                : null,
    inStock: typeof product.is_in_stock === 'boolean' ? product.is_in_stock : typeof product.in_stock === 'boolean'
        ? product.in_stock
        : product.stock_status === 'instock'
            ? true
            : product.stock_status === 'outofstock'
                ? false
                : null,
    purchasable: typeof product.is_purchasable === 'boolean' ? product.is_purchasable : typeof product.purchasable === 'boolean' ? product.purchasable : null,
});

/**
 * Get WooCommerce API credentials from environment
 */
const getWooConfig = () => {
    const url = process.env.WOOCOMMERCE_URL;
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!url || !consumerKey || !consumerSecret) return null;

    return { url, consumerKey, consumerSecret };
};

/**
 * Build WooCommerce API URL and Headers
 */
const getWooRequestConfig = (endpoint, params = {}, method = 'GET') => {
    const config = getWooConfig();
    const base = String(process.env.WOOCOMMERCE_URL || '').replace(/\/$/, '');
    const publicCatalog = !config && base && method === 'GET' && ['products','products/tags','products/categories'].includes(endpoint);
    if (!config && !publicCatalog) return null;

    const url = new URL(`${base}/wp-json/wc/${publicCatalog ? 'store/v1' : 'v3'}/${endpoint}`);
    if (url.protocol !== 'https:') throw new Error('WooCommerce URL must use HTTPS');

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.append(key, value);
        }
    });

    const headers = {
        'Content-Type': 'application/json',
    };

    if (config) {
        const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
    }

    return { url: url.toString(), headers };
};

const requestWoo = (request, { signal = null, ...options } = {}) => {
    if (!request) return Promise.resolve(null);
    return withAbortableTimeout(
        async (requestSignal) => {
            const response = await fetch(request.url, {
                ...options,
                headers: request.headers,
                signal: requestSignal,
            });
            // Consume the body before the timeout helper closes its signal.
            const body = await response.json().catch(() => ({}));
            return { ok: response.ok, status: response.status, json: async () => body };
        },
        WOO_REQUEST_TIMEOUT_MS,
        { signal, timeoutMessage: 'WooCommerce request timed out' },
    );
};

// Reads every page of a WooCommerce list endpoint.
const fetchAllPages = async (endpoint, params, label) => {
    const items = [];
    let page = 1;
    while (page <= WOO_MAX_CATALOG_PAGES) {
        const req = getWooRequestConfig(endpoint, { per_page: 100, ...params, page });
        if (!req) break;
        // No caller signal here: one load is shared by every waiting request,
        // so one farmer leaving must not cancel it. The timeout still applies.
        const response = await requestWoo(req);
        if (!response.ok) throw new Error(`WooCommerce ${label} API error: ${response.status}`);
        const rows = await response.json();
        if (!Array.isArray(rows) || rows.length === 0) break;
        items.push(...rows);
        if (rows.length < 100) break;
        page += 1;
    }
    if (page > WOO_MAX_CATALOG_PAGES) console.warn(`⚠️ WooCommerce ${label} catalog capped at ${WOO_MAX_CATALOG_PAGES} pages.`);
    return items;
};

const CATALOG_LOADERS = {
    woo_all_tags: async () => {
        const tags = await fetchAllPages('products/tags', {}, 'tags');
        const useful = tags
            .map((tag) => ({ id: tag.id, name: decodeHtmlEntities(tag.name), count: tag.count }))
            .filter((tag) => tag.count > 0);
        console.log(`✅ Cached ${useful.length} product tags from WooCommerce`);
        return useful;
    },
    woo_all_categories: async () => {
        const categories = await fetchAllPages('products/categories', {}, 'categories');
        const useful = categories
            .map((category) => ({
                id: category.id,
                name: decodeHtmlEntities(category.name),
                count: category.count,
                parent: category.parent,
            }))
            .filter((category) => category.count > 0);
        console.log(`✅ Cached ${useful.length} product categories from WooCommerce`);
        return useful;
    },
    woo_all_products: async () => {
        const products = (await fetchAllPages('products', { status: 'publish' }, 'products')).map(transformWooProduct);
        console.log(`✅ Cached ${products.length} products from WooCommerce`);
        return products;
    },
};

const CATALOG_TTL_MS = {
    woo_all_tags: 6 * 60 * 60 * 1000,
    woo_all_categories: 6 * 60 * 60 * 1000,
    woo_all_products: 60 * 60 * 1000,
};

const logBackgroundError = (key, error) => console.error(`❌ WooCommerce background refresh failed (${key}):`, error.message);
const catalogCaches = Object.fromEntries(Object.keys(CATALOG_LOADERS)
    .map((key) => [key, createCatalogCache({ ttlMs: CATALOG_TTL_MS[key], onBackgroundError: logBackgroundError })]));

// Returns the cached list, sharing one load between requests and keeping the
// last good copy when the store is slow or down. Returns [] only when the
// store has never answered since the server started.
const readCatalog = async (key, { signal = null } = {}) => {
    if (!process.env.WOOCOMMERCE_URL) return [];
    try {
        return await catalogCaches[key].get(key, CATALOG_LOADERS[key], { signal });
    } catch (error) {
        if (signal?.aborted) throw error;
        console.error(`❌ WooCommerce ${key} fetch failed:`, error.message);
        return [];
    }
};

/**
 * Fetch all WooCommerce product tags (cached, paginated)
 * @returns {Promise<Array>} Array of { id, name, count }
 */
export const getAllTags = (options) => readCatalog('woo_all_tags', options);

/**
 * Fetch all WooCommerce product categories (cached, paginated)
 * @returns {Promise<Array>} Array of { id, name, count, parent }
 */
export const getAllCategories = (options) => readCatalog('woo_all_categories', options);

/**
 * Fetch all products from WooCommerce (cached, paginated)
 * @returns {Promise<Array>} Array of products
 */
export const getAllProducts = (options) => readCatalog('woo_all_products', options);

// Loads the catalogue once at server start so the first farmer does not wait.
export const warmCatalogCache = async () => {
    if (!process.env.WOOCOMMERCE_URL) return;
    await Promise.all(Object.keys(CATALOG_LOADERS).map((key) => readCatalog(key)));
};

// Called when the store reports a product change: drops filtered results and
// reloads the full lists in the background (old copies serve until then).
export const refreshCatalogCache = () => {
    productCache.flushAll();
    return Object.values(catalogCaches).reduce((count, cache) => count + cache.expireAll(), 0);
};

/**
 * Get products matching specific WooCommerce tag IDs and/or category IDs
 * @param {Array<number>} tagIds - Array of WooCommerce tag IDs
 * @param {Array<number>} categoryIds - Optional array of WooCommerce category IDs
 * @returns {Promise<Array>} Matching products sorted by relevance
 */
const normalizeProductQueryIds = (values = []) => (Array.isArray(values) ? values : [])
    .map((value) => Number.parseInt(value, 10))
    .filter((value, index, all) => Number.isInteger(value) && all.indexOf(value) === index);

const normalizeProductSearchTerms = (values = []) => (Array.isArray(values) ? values : [])
    .map((value) => String(value || '').trim())
    .filter((value, index, all) => value.length >= 3 && all.indexOf(value) === index)
    .slice(0, 2);

const fetchFilteredProducts = async (params, { signal = null } = {}) => {
    const cacheKey = `woo_filtered_products_${Object.entries(params)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}-${String(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`)
        .join('_')}`;
    const cached = productCache.get(cacheKey);
    if (cached) return cached;

    const req = getWooRequestConfig('products', {
        per_page: 50,
        status: 'publish',
        ...params,
    });
    if (!req) return [];

    const response = await requestWoo(req, { signal });
    if (!response.ok) throw new Error(`WooCommerce filtered products API error: ${response.status}`);
    const products = await response.json();
    const transformed = (Array.isArray(products) ? products : []).map(transformWooProduct);
    productCache.set(cacheKey, transformed);
    return transformed;
};

export const getProductsByTagIds = async (tagIds, categoryIds = [], { signal = null, searchTerms = [] } = {}) => {
    const normalizedTagIds = normalizeProductQueryIds(tagIds);
    const normalizedCategoryIds = normalizeProductQueryIds(categoryIds);
    const normalizedSearchTerms = normalizeProductSearchTerms(searchTerms);
    if (normalizedTagIds.length === 0 && normalizedCategoryIds.length === 0 && normalizedSearchTerms.length === 0) return [];

    const queries = [
        ...normalizedTagIds.map((id) => ({ tag: id })),
        ...normalizedCategoryIds.map((id) => ({ category: id })),
        ...normalizedSearchTerms.map((search) => ({ search })),
    ];
    const results = await Promise.allSettled(queries.map((query) => fetchFilteredProducts(query, { signal })));
    const productsById = new Map();

    results.forEach((result) => {
        if (result.status !== 'fulfilled') {
            console.warn('⚠️ WooCommerce filtered product query failed:', result.reason?.message || result.reason);
            return;
        }
        result.value.forEach((product) => {
            const key = String(product.id);
            const existing = productsById.get(key);
            if (existing) {
                existing.sourceScore += 1;
                return;
            }
            productsById.set(key, { product, sourceScore: 1 });
        });
    });

    return [...productsById.values()]
        .sort((left, right) => right.sourceScore - left.sourceScore || Number(left.product.id) - Number(right.product.id))
        .map(({ product }) => product)
        .slice(0, 30);
};

export const getStoreUrl = () => {
    return process.env.WOOCOMMERCE_URL || null;
};

/**
 * Check if WooCommerce is configured
 */
export const isWooCommerceEnabled = () => {
    return !!process.env.WOOCOMMERCE_URL;
};

/**
 * Create a new Guest Order in WooCommerce
 * @param {Object} orderData - Order details (items, billing, guestId)
 */
export const createOrder = async (orderData, { signal = null } = {}) => {
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
        
        const response = await requestWoo(req, {
            method: 'POST',
            body: JSON.stringify(payload),
            signal,
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
export const getOrdersByIds = async (ids, { signal = null } = {}) => {
    if (!ids || !Array.isArray(ids) || ids.length === 0) return [];

    try {
        // WooCommerce 'include' param handles multiple IDs
        const req = getWooRequestConfig('orders', { include: ids.join(',') });
        const response = await requestWoo(req, { signal });
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
export const getOrdersByAppId = async (appId, { signal = null } = {}) => {
    if (!appId) return [];

    try {
        let matchingOrders = [];
        let page = 1;
        const maxPages = 3; // Check last 300 orders (reasonable for guest history)

        while (page <= maxPages) {
            const req = getWooRequestConfig('orders', { per_page: 100, page });
            if (!req) break;

            const response = await requestWoo(req, { signal });
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
export const getOrderStatus = async (orderId, { signal = null } = {}) => {
    try {
        const req = getWooRequestConfig(`orders/${orderId}`);
        const response = await requestWoo(req, { signal });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        return null;
    }
};
