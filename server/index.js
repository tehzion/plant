import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import NodeCache from 'node-cache';
import crypto from 'crypto';
import { logTrainingData, logFeedback } from './utils/dataCollector.js';
import { identifyPlantWithPlantNet, identifyPlantWithGPTVision, analyzeWithGPT4Mini, askAI } from './services/aiService.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize Cache (Default TTL: 7 days for Questions, 24h for images)
const aiCache = new NodeCache({ stdTTL: 86400 });

// Security & Config
app.use(helmet()); // Add security headers
app.use(compression()); // Compress all responses
app.use(cors({
    origin: '*',
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
app.use('/api/', limiter);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Plant Analysis API',
        timestamp: new Date().toISOString()
    });
});

// General AI Question Endpoint (Cached)
app.post('/api/ask', async (req, res, next) => {
    try {
        const { question, language = 'en' } = req.body;

        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }

        // 1. Normalize Cache Key
        const normalizedQuestion = question.toLowerCase().trim().replace(/[^\w\s]/gi, '');
        const cacheKey = `ask_${language}_${normalizedQuestion}`;

        // 2. Check Cache
        const cachedAnswer = aiCache.get(cacheKey);
        if (cachedAnswer) {
            console.log(`🧠 Cache HIT for question: "${question.substring(0, 30)}..."`);
            return res.json({ ...cachedAnswer, cached: true });
        }

        console.log(`🧠 Cache MISS for question: "${question.substring(0, 30)}..." - Calling OpenAI...`);

        // 3. Call Service
        const answer = await askAI(question, language);

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
        const { scanId, rating, comment, correction } = req.body;

        if (!scanId || !rating) {
            return res.status(400).json({ error: 'scanId and rating are required' });
        }

        const success = await logFeedback({ scanId, rating, comment, correction });

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
        // Fix: Extract treeImage/leafImage to match Frontend Payload (src/utils/diseaseDetection.js)
        // Fallback to 'image' for backward compatibility
        const { treeImage, leafImage, image, category, language = 'en', location } = req.body;

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
        let plantNetResult = await identifyPlantWithPlantNet(mainImage);
        let identificationSource = 'PlantNet';

        // 4. Fallback Identification (GPT Vision)
        if (!plantNetResult) {
            const gptVisionResult = await identifyPlantWithGPTVision(mainImage, category);
            if (gptVisionResult) {
                plantNetResult = gptVisionResult;
                identificationSource = 'GPT-Vision';
            }
        }

        if (!plantNetResult) {
            console.warn('⚠️ Both PlantNet and Backup Model failed to identify species');
        }

        // 5. Analyze Health (GPT-4o-mini)
        // Fix: Pass leafImage correctly to analysis service
        const analysisResult = await analyzeWithGPT4Mini(
            plantNetResult,
            mainImage,
            leafImage,
            category,
            language,
            location
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
                source: identificationSource
            }
        }).catch(err => console.error('Data logging failed:', err));

        res.json(finalResult);

        // ... (previous code)

    } catch (error) {
        next(error);
    }
});

app.post('/api/feedback', async (req, res, next) => {
    try {
        const { scanId, rating, comment } = req.body;

        if (!scanId || !rating) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await logFeedback({ scanId, rating, comment });
        res.json({ status: 'ok', message: 'Feedback received' });
    } catch (error) {
        // Non-critical endpoint, verify error but don't crash flow usually
        console.error('Feedback error:', error);
        res.status(500).json({ error: 'Failed to process feedback' });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('🔥 Global Error:', err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong. Please try again.'
    });
});

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`🛡️ Security Headers: Enabled`);
    console.log(`🧠 AI Cache: Enabled`);
});