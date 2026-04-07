import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import NodeCache from 'node-cache';
import crypto from 'crypto';
import { logTrainingData, logFeedback } from './utils/dataCollector.js';
import { identifyPlantWithPlantNet, identifyPlantWithGPTVision, analyzeWithGPT4Mini, askAI, recommendProductTags, generateAgronomistInsights, generateTreatmentSOP, parseNaturalLanguageLog, generatePredictiveRisk } from './services/aiService.js';
import { getAllTags, getAllCategories, getAllProducts, getProductsByTagIds, getStoreUrl, createOrder, getOrdersByAppId, getOrderStatus, getOrdersByIds, isWooCommerceEnabled } from './services/wooCommerceService.js';

import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

const withStageTimeout = async (promise, timeoutMs, fallbackValue = null) => {
    let timeoutId = null;
    try {
        return await Promise.race([
            promise,
            new Promise((resolve) => {
                timeoutId = setTimeout(() => resolve(fallbackValue), timeoutMs);
            }),
        ]);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
};

// Initialize Cache (Default TTL: 7 days for Questions, 24h for images)
const aiCache = new NodeCache({ stdTTL: 86400 });

// Security Headers & Middlewares
app.use(helmet());
app.use(compression());

// Restricted CORS
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'https://tehzion-plant.vercel.app'
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl) or allowed origins
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser (50mb for images)
app.use(express.json({ limit: '50mb' }));

// Debug logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Health Check
app.get('/api/health', (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    res.json({
        status: 'ok',
        message: 'Plant Analysis API',
        timestamp: new Date().toISOString(),
        ...(!isProduction && {
            config: {
                openai: !!process.env.OPENAI_API_KEY,
                plantnet: !!process.env.PLANTNET_API_KEY
            }
        })
    });
});

app.use('/api/', limiter);

// General AI Question Endpoint (Cached)
app.post('/api/ask', async (req, res, next) => {
    try {
        const {
            question,
            language = 'en',
            recentNotes = [],
            recentAlerts = [],
        } = req.body;

        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }

        if (!process.env.OPENAI_API_KEY) {
            return res.status(503).json({ error: 'Service Unavailable', message: 'OpenAI API Key is missing on the server.' });
        }

        // 1. Normalize Cache Key
        const normalizedQuestion = question.toLowerCase().trim().replace(/[^\w\s]/gi, '');
        const contextHash = crypto
            .createHash('md5')
            .update(JSON.stringify({
                recentNotes: Array.isArray(recentNotes) ? recentNotes.slice(0, 5) : [],
                recentAlerts: Array.isArray(recentAlerts) ? recentAlerts.slice(0, 3) : [],
            }))
            .digest('hex')
            .slice(0, 12);
        const cacheKey = `ask_${language}_${normalizedQuestion}_${contextHash}`;

        // 2. Check Cache
        const cachedAnswer = aiCache.get(cacheKey);
        if (cachedAnswer) {
            console.log(`🧠 Cache HIT for question: "${question.substring(0, 30)}..."`);
            return res.json({ ...cachedAnswer, cached: true });
        }

        console.log(`🧠 Cache MISS for question: "${question.substring(0, 30)}..." - Calling OpenAI...`);

        // 3. Call Service
        const answer = await askAI(question, language, recentNotes, recentAlerts);

        // 4. Save to Cache (7 Days = 604800 seconds)
        const result = { answer, timestamp: Date.now() };
        aiCache.set(cacheKey, result, 604800);

        res.json({ ...result, cached: false });

    } catch (error) {
        next(error);
    }
});

// Feedback Endpoint
app.post('/api/feedback', async (req, res, next) => {
    try {
        const {
            scanId,
            rating,
            comment,
            correction,
            wasCorrect,
            correctCrop,
            correctDisease,
            issueType,
            note,
        } = req.body;

        if (!scanId || (typeof rating === 'undefined' && typeof wasCorrect === 'undefined')) {
            return res.status(400).json({ error: 'scanId and either rating or wasCorrect are required' });
        }

        const success = await logFeedback({
            scanId,
            rating,
            comment,
            correction,
            wasCorrect,
            correctCrop,
            correctDisease,
            issueType,
            note,
        });

        if (success) {
            res.json({ message: 'Feedback received' });
        } else {
            res.status(500).json({ error: 'Failed to log feedback' });
        }
    } catch (error) {
        next(error);
    }
});

// Main Analysis Endpoint
app.post('/api/analyze', async (req, res, next) => {
    try {
        // Validation: Critical Keys
        if (!process.env.OPENAI_API_KEY) {
            console.error('❌ Request Failed: OPENAI_API_KEY is missing.');
            return res.status(503).json({
                error: 'Configuration Error',
                message: 'Server is missing API Keys. Please check Render Environment Variables.'
            });
        }

        // Fix: Extract treeImage/leafImage to match Frontend Payload (src/utils/diseaseDetection.js)
        // Fallback to 'image' for backward compatibility
        const { treeImage, leafImage, image, category, language = 'en', location, imageQuality = null } = req.body;

        const mainImage = treeImage || image;

        if (!mainImage) {
            return res.status(400).json({ error: 'Image (treeImage) is required' });
        }

        console.log(`📸 New Analysis Request - Category: ${category}, Location: ${location || 'Not provided'}`);

        // 1. Generate Image Hash for Caching
        const imageHash = crypto.createHash('md5').update(mainImage).digest('hex');
        const cacheKey = `analyze_${imageHash}_${language}`;

        // 2. Check Cache
        const cachedResult = aiCache.get(cacheKey);
        if (cachedResult) {
            console.log('🧠 Image Analysis Cache HIT');
            return res.json({ ...cachedResult, cached: true });
        }
        console.log('🧠 Image Analysis Cache MISS - Processing...');

        // 3. Identify Species
        let plantNetResult = await withStageTimeout(
            identifyPlantWithPlantNet(mainImage),
            12000,
            null,
        );
        let identificationSource = 'PlantNet';

        // 4. Fallback Identification (GPT Vision)
        if (!plantNetResult) {
            const gptVisionResult = await withStageTimeout(
                identifyPlantWithGPTVision(mainImage, category),
                12000,
                null,
            );
            if (gptVisionResult) {
                if (gptVisionResult.isPlant === false) {
                    console.warn('⚠️ Image identified as NOT a plant.');
                    return res.status(400).json({
                        error: 'NOT_A_PLANT',
                        message: 'NOT_A_PLANT'
                    });
                }
                plantNetResult = gptVisionResult;
                identificationSource = 'GPT-Vision';
            }
        }

        if (!plantNetResult) {
            console.warn('⚠️ Both PlantNet and Backup Model failed to identify species');
        }

        // 5. Analyze Health (GPT-4o-mini)

        const analysisResult = await analyzeWithGPT4Mini(
            plantNetResult,
            mainImage,
            leafImage,
            category,
            language,
            location,
            imageQuality,
        );

        const finalResult = {
            ...analysisResult,
            description: analysisResult.additionalNotes, // Map for PDF compatibility
            identification: plantNetResult,
            identificationSource
        };

        // 6. Cache Result (24 Hours)
        aiCache.set(cacheKey, finalResult, 86400);

        // 7. Log Data for Training (Fire & Forget)
        // Fix: Pass single object as expected by dataCollector.js
        logTrainingData({
            id: Date.now().toString(),
            treeImage: mainImage,
            leafImage: leafImage,
            category,
            result: finalResult,
            metadata: {
                language,
                location,
                source: identificationSource,
                imageQuality,
                plantNetCandidates: plantNetResult?.allMatches || [],
                confidenceBreakdown: finalResult.confidenceBreakdown || null,
                status: finalResult.status || null,
                differentialDiagnoses: finalResult.differentialDiagnoses || [],
            }
        }).catch(err => console.error('Data logging failed:', err));

        res.json(finalResult);

        // ... (previous code)

    } catch (error) {
        next(error);
    }
});



// WooCommerce Products Search Endpoint (GPT-5-mini Powered)
app.post('/api/products/search', async (req, res, next) => {
    try {
        const { diagnosis } = req.body;
        
        if (!diagnosis) {
            return res.status(400).json({ error: 'Diagnosis object is required' });
        }

        if (!isWooCommerceEnabled()) {
            return res.status(503).json({
                error: 'PRODUCT_CATALOG_UNAVAILABLE',
                message: 'Live product catalog is not configured right now.',
            });
        }
        
        // 1. Fetch all available WooCommerce tags AND categories in parallel
        const [availableTags, availableCategories] = await Promise.all([
            getAllTags(),
            getAllCategories()
        ]);
        
        if (availableTags.length === 0 && availableCategories.length === 0) {
            return res.json({
                diseaseControl: [],
                fertilizers: [],
                supplements: [],
                otherPopular: [],
                reasoning: '',
                fallbackMeta: null,
                storeUrl: getStoreUrl()
            });
        }
        
        // 2. Ask GPT to pick the best tags & categories
        console.log(`🛒 AI Recommendation: Analyzing diagnosis for "${diagnosis.disease}"...`);
        const recommendation = await recommendProductTags(diagnosis, availableTags, availableCategories);
        
        // 3. Fetch products for each category in parallel
        const [treatmentProducts, fertilizerProducts, supplementProducts, allStoreProducts] = await Promise.all([
            getProductsByTagIds(recommendation.treatmentTagIds, recommendation.treatmentCategoryIds),
            getProductsByTagIds(recommendation.fertilizerTagIds, recommendation.fertilizerCategoryIds),
            getProductsByTagIds(recommendation.supplementTagIds, recommendation.supplementCategoryIds),
            getAllProducts()
        ]);
        
        // 4. Group and deduplicate
        const includedIds = new Set();
        
        const finalizeList = (list) => {
            const result = [];
            for (const p of list) {
                if (!includedIds.has(p.id)) {
                    result.push(p);
                    includedIds.add(p.id);
                }
            }
            return result;
        };

        const finalTreatment = finalizeList(treatmentProducts);
        const finalFertilizers = finalizeList(fertilizerProducts);
        const finalSupplements = finalizeList(supplementProducts);
        
        // 5. Always include some basic products if the main categories are empty
        let otherPopular = [];
        const totalCount = finalTreatment.length + finalFertilizers.length + finalSupplements.length;
        let fallbackMeta = null;
        
        // If we have nothing specific, pull "Other Popular" from the whole store
        if (totalCount === 0 && allStoreProducts.length > 0) {
            console.log('ℹ️ No direct diagnosis-matched products found. Adding fallback store suggestions...');
            for (const product of allStoreProducts) {
                if (otherPopular.length >= 8) break; // Increased to 8 for better exploration
                if (!includedIds.has(product.id)) {
                    otherPopular.push(product);
                    includedIds.add(product.id);
                }
            }
        }

        console.log(`✅ Returning: ${finalTreatment.length} treatment, ${finalFertilizers.length} fertilizers, ${finalSupplements.length} supplements, ${otherPopular.length} popular`);
        
        if (totalCount === 0) {
            fallbackMeta = {
                used: true,
                isExploration: true,
                reason: 'We currently don\'t have a specific medicine for this diagnosis in our inventory. Below are general agriculture supplies that other farmers often explore.',
            };
        } else {
            otherPopular = []; // Keep it clean if we HAVE specific products
            fallbackMeta = null;
        }

        res.json({
            diseaseControl: finalTreatment,
            fertilizers: finalFertilizers,
            supplements: finalSupplements,
            otherPopular: otherPopular,
            reasoning: recommendation.reasoning,
            fallbackMeta,
            storeUrl: getStoreUrl()
        });
    } catch (error) {
        console.error('❌ Product search failed:', error);
        res.status(500).json({ error: 'Failed to search products' });
    }
});

// ----------------------------------------------------------------------------------
// WOOCOMMERCE GUEST ORDER ENDPOINTS
// ----------------------------------------------------------------------------------

// Create guest order
app.post('/api/orders', async (req, res, next) => {
    try {
        const { items, billing, shipping, guestId } = req.body;

        if (!items || !items.length || !guestId) {
            return res.status(400).json({ error: 'Items and guestId are required' });
        }

        const order = await createOrder({ items, billing, shipping, guestId });
        res.status(201).json(order);
    } catch (error) {
        console.error('❌ Order creation endpoint failed:', error.message);
        res.status(500).json({ error: 'Failed to create order', message: error.message });
    }
});

// Get orders by App ID (localStorage session)
app.get('/api/orders/user/:appId', async (req, res, next) => {
    try {
        const { appId } = req.params;
        const { ids } = req.query; // Optional comma-separated IDs from frontend

        if (ids) {
            const idArray = ids.split(',').filter(id => id.trim());
            const orders = await getOrdersByIds(idArray);
            return res.json(orders);
        }

        const orders = await getOrdersByAppId(appId);
        res.json(orders);
    } catch (error) {
        console.error('❌ Orders fetch endpoint failed:', error.message);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Get single order status
app.get('/api/orders/:orderId', async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const order = await getOrderStatus(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch order details' });
    }
});

// ----------------------------------------------------------------------------------
// PHASE 3: FARM INTELLIGENCE ENDPOINTS
// ----------------------------------------------------------------------------------

// 1. AI Agronomist Insights
app.post('/api/farm/insights', async (req, res, next) => {
    try {
        const { logs, alerts, harvestData, plots, checklistPct, language = 'en' } = req.body;
        if (!logs || !Array.isArray(logs)) {
            return res.status(400).json({ error: 'logs array is required' });
        }
        const insights = await generateAgronomistInsights(logs, alerts, harvestData, plots, checklistPct, language);
        res.json(insights);
    } catch (error) {
        next(error);
    }
});

// 2. Smart Treatment SOP Generator
app.post('/api/farm/sop', async (req, res, next) => {
    try {
        const { crop, disease, severity, language = 'en' } = req.body;
        if (!crop || !disease) {
            return res.status(400).json({ error: 'crop and disease are required' });
        }
        const sop = await generateTreatmentSOP(crop, disease, severity, language);
        res.json(sop);
    } catch (error) {
        next(error);
    }
});

// 3. Natural Language Activity Logging
app.post('/api/farm/parse-log', async (req, res, next) => {
    try {
        const { text, language = 'en' } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'text is required' });
        }
        const parsedData = await parseNaturalLanguageLog(text, language);
        res.json(parsedData);
    } catch (error) {
        next(error);
    }
});

// 4. Predictive Farm Risk Assessor
app.post('/api/farm/predict', async (req, res, next) => {
    try {
        const { plots, logs, alerts, location, language = 'en' } = req.body;
        const risk = await generatePredictiveRisk(plots, logs, alerts, location, language);
        res.json(risk);
    } catch (error) {
        next(error);
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';
    console.error(`🔥 [${req.method} ${req.url}] Error:`, isProduction ? err.message : err.stack);

    res.status(err.status || 500).json({
        error: isProduction ? 'Internal Server Error' : (err.name || 'Internal Server Error'),
        message: isProduction ? 'An unexpected error occurred. Please try again later.' : err.message,
        ...(isProduction ? {} : { stack: err.stack })
    });
});

// Serve Static Assets in Production
if (process.env.NODE_ENV === 'production') {
    // Serve static files from the React app
    app.use(express.static(path.join(__dirname, '../dist')));

    // Handle React routing, return all requests to React app
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist', 'index.html'));
    });
}

// Only start server if NOT on Vercel (Vercel handles it as a serverless function)
if (!process.env.VERCEL) {
    const server = app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
        console.log(`🛡️ Security Headers: Enabled`);
        console.log(`🧠 AI Cache: Enabled`);
        console.log(`🚀 Ready to accept connections`);
    });

    // Graceful Shutdown
    process.on('SIGTERM', () => {
        console.log('SIGTERM signal received: closing HTTP server');
        server.close(() => {
            console.log('HTTP server closed');
        });
    });
}

// Global Process Error Handlers (Critical for stability)
process.on('uncaughtException', (error) => {
    console.error('🔥 CRITICAL: Uncaught Exception:', error);
    // In production, you might want to exit here, but for now we log it to prevent silent failures
    // process.exit(1); 
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;
