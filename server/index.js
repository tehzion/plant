import { checkDecisionShadow } from './services/decisionShadowService.js';
import express from 'express';
import { registerEvaluationRoutes } from './evaluation/api.js';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import NodeCache from 'node-cache';
import crypto from 'crypto';
import { buildAnalysisCacheKey } from './utils/analysisCache.js';
import { isAiProviderConfigured, resolveAiProvider } from './utils/aiProvider.js';
import { createOrderSession, verifyOrderSession, requireOrderSession, ownsOrder, summarizeOrder } from './utils/orderAccess.js';
import { validateApiRequest } from './utils/requestValidation.js';
import { logAssistantFeedback, logTrainingData, logFeedback, withdrawTrainingImages } from './utils/dataCollector.js';
import { identifyPlantWithPlantNet, identifyPlantWithGPTVision, analyzeWithGPT4Mini, askAI, buildKeywordProductRecommendation, generateAgronomistInsights, generateTreatmentSOP, parseNaturalLanguageLog, generatePredictiveRisk, localizeStoredAnalysisResult, canRecommendTreatmentProducts, enrichRecommendedProducts, getProductRecommendationIntent, buildProductConsultation, PRODUCT_RECOMMENDATION_INTENTS, normalizeFarmerCrop } from './services/aiService.js';
import { getAdminReviewSummary, verifyAdminRequest } from './services/adminAnalyticsService.js';
import { getReviewCase, listReviewQueue, submitExpertReview, verifyReviewerRequest } from './services/expertReviewService.js';
import { registerFarmerReviewRoutes } from './routes/farmerReviewRoutes.js';
import { getBearerToken, verifyAuthenticatedUser } from './utils/supabaseAuth.js';
import { consumeAiQuota } from './services/aiQuotaService.js';
import { trackAiUsage } from './utils/aiUsage.js';
import { correctMygapLog, deleteMygapLog, listMygapLogRevisions } from './services/mygapRecordService.js';
import { buildRecommendationSnapshot, saveRecommendationSnapshot } from './services/recommendationSnapshotService.js';
import { captureError, flushErrorTracking, initErrorTracking } from './utils/errorTracking.js';
import { getReportSummary, getScanHistoryPage } from './services/reportService.js';
import { syncOperation } from './services/syncService.js';
import { claimAnalysis, releaseAnalysis } from './services/analysisRequestService.js';
import { createFollowUpEvent, listFollowUpEvents } from './services/followUpService.js';
import { getDiseaseProductRules } from './services/diseaseProductRuleService.js';
import { partitionByEligibility } from './services/productEligibility.js';
import { getAllTags, getAllCategories, getProductsByTagIds, getStoreUrl, createOrder, getOrdersByAppId, getOrderStatus, getOrdersByIds, isWooCommerceEnabled } from './services/wooCommerceService.js';
import { getScanSectionPolicy } from '../shared/scanResultPolicy.js';
import { withAbortableTimeout } from './utils/requestTimeout.js';
import { checkNeonDatabase, queryNeon, withNeonTransaction } from './utils/neonDatabase.js';
import { createScanCapability, hashIdentity, verifyScanCapability } from './utils/scanCapability.js';
import { classifyAnalysisFailure } from './utils/analysisErrors.js';
import { chatWithAssistant } from './services/assistantService.js';
import { bulkInsertUserRows, deleteUserRow, getDatasetNames, getTelemetryDatasetNames, getUserRow, insertTelemetryRow, insertUserRow, listUserRows, updateUserRow } from './services/neonDataService.js';

import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables. Neon pulls local development credentials into
// .env.local; hosted environments continue to provide env vars directly.
dotenv.config({ path: '.env.local' });
dotenv.config();
initErrorTracking();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || false);
const PORT = process.env.PORT || 3002;

// Correlate failures without ever logging request bodies, credentials, or
// image payloads. The same ID is returned to clients for support diagnostics.
app.use((req, res, next) => {
    const requestId = req.get('x-request-id')?.slice(0, 80) || crypto.randomUUID();
    const startedAt = process.hrtime.bigint();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        console.log(JSON.stringify({
            event: 'http_request', requestId, method: req.method,
            path: req.path, status: res.statusCode,
            durationMs: Math.round(durationMs * 100) / 100,
        }));
    });
    next();
});

const withStageTimeout = async (operation, timeoutMs, fallbackValue = null, parentSignal = null) => {
    try {
        return await withAbortableTimeout(operation, timeoutMs, {
            signal: parentSignal,
            timeoutMessage: 'AI pipeline stage timed out',
        });
    } catch (error) {
        if (parentSignal?.aborted) throw error;
        console.warn('AI pipeline stage skipped:', error.message);
        return fallbackValue;
    }
};

// Initialize Cache (Default TTL: 7 days for Questions, 24h for images)
const aiCache = new NodeCache({ stdTTL: 86400, maxKeys: 2000 });
const cacheResult = (key, value, ttl) => {
    try { aiCache.set(key, value, ttl); } catch (error) { console.warn('AI cache write skipped:', error.message); }
};

// Security Headers & Middlewares
app.use(helmet());
app.use(compression());

const parseOriginList = (value = '') => String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

// Restricted CORS
const allowedOrigins = [
    ...parseOriginList(process.env.FRONTEND_URL),
    ...parseOriginList(process.env.FRONTEND_URLS),
    'http://localhost:3000',
    'http://localhost:5173',
    'https://plant-2-uvev.onrender.com',
    'https://ai.kanb.coop.my',
    'https://mojosense.app',
    'https://www.mojosense.app',
    'https://tehzion-plant.vercel.app'
].filter(Boolean);

// Allow all Vercel preview deployments for this project:
//   tehzion-plant-<hash>.vercel.app          (Vercel deployment URL)
//   tehzion-plant-git-<branch>-<team>.vercel.app  (git-branch preview)
//   tehzion-plant-<anything>-tehzions-projects.vercel.app  (team project)
const allowedOriginPatterns = [
    /^https:\/\/tehzion-plant(?:-[a-z0-9-]+)?\.vercel\.app$/i,
    /^https:\/\/tehzion-plant-git-[a-z0-9-]+-[a-z0-9-]+\.vercel\.app$/i,
    /^https:\/\/tehzion-plant(?:-[a-z0-9-]+)*-tehzions-projects\.vercel\.app$/i,
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl) or allowed origins
        if (!origin || allowedOrigins.includes(origin) || allowedOriginPatterns.some((pattern) => pattern.test(origin))) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Reject excessive traffic before buffering image payloads.
app.use('/api/', rateLimit({
    windowMs: 60 * 1000, max: 60,
    standardHeaders: true, legacyHeaders: false,
    skip: (req) => req.path === '/health',
    handler: (req, res) => {
        console.warn(JSON.stringify({ event: 'rate_limit', requestId: req.requestId, path: req.path, ip: req.ip }));
        res.status(429).json({ error: 'Too many requests. Please try again later.', requestId: req.requestId });
    },
}));
app.use(express.json({ limit: '17mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(JSON.stringify({ event: 'rate_limit', requestId: req.requestId, path: req.path, ip: req.ip }));
        res.status(429).json({ error: 'Too many requests from this IP, please try again later.', requestId: req.requestId });
    },
});

// Health Check — also used as a keep-alive ping after Render cold starts.
// Render free-tier instances spin down after inactivity; the frontend pings
// this endpoint on app load to wake the backend before the first API call.
app.get('/api/health', (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    res.json({
        status: 'ok',
        message: 'Plant Analysis API',
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        ...(!isProduction && {
            config: {
                aiProvider: resolveAiProvider().provider,
                aiConfigured: isAiProviderConfigured(),
                plantnet: !!process.env.PLANTNET_API_KEY
            }
        })
    });
});

app.get('/api/neon/health', async (req, res) => {
    const database = await checkNeonDatabase();
    res.status(database.connected ? 200 : 503).json(database);
});

const optionalAuthenticatedUser = async (req) => {
    if (!getBearerToken(req)) return null;
    return verifyAuthenticatedUser(req);
};

// Neon is the application database. These routes deliberately keep the
// database credential on the server and enforce ownership after Supabase Auth
// verifies the bearer token. Supabase remains responsible only for Auth and
// private image Storage.
app.get('/api/data/:table', async (req, res, next) => {
    try {
        if (!getDatasetNames().includes(req.params.table)) return res.status(404).json({ error: 'Data collection not found.' });
        const user = await verifyAuthenticatedUser(req);
        const result = await listUserRows(req.params.table, user.id, req.query);
        res.json({ rows: result.rows, data: result.rows, count: result.count });
    } catch (error) { next(error); }
});

app.post('/api/data/:table', async (req, res, next) => {
    try {
        const { table } = req.params;
        if (getTelemetryDatasetNames().includes(table)) {
            const user = await optionalAuthenticatedUser(req);
            const row = await insertTelemetryRow(table, req.body?.payload || req.body, {
                userId: user?.id || null,
                guestId: req.body?.guest_id || req.body?.payload?.guest_id || null,
            });
            return res.status(201).json({ row, data: row });
        }
        if (!getDatasetNames().includes(table)) return res.status(404).json({ error: 'Data collection not found.' });
        const user = await verifyAuthenticatedUser(req);
        const operation = req.body?.operation || 'insert';
        const payload = req.body?.payload || req.body;
        if (operation === 'bulk-upsert') {
            const rows = await bulkInsertUserRows(table, user.id, req.body?.rows || [], { upsert: true });
            return res.status(201).json({ rows, data: rows });
        }
        const row = await insertUserRow(table, user.id, payload, { upsert: operation === 'upsert' });
        res.status(201).json({ row, data: row });
    } catch (error) { next(error); }
});

app.post('/api/data/:table/:id', async (req, res, next) => {
    try {
        const { table, id } = req.params;
        if (!getDatasetNames().includes(table)) return res.status(404).json({ error: 'Data collection not found.' });
        const user = await verifyAuthenticatedUser(req);
        const operation = req.body?.operation || 'update';
        const payload = req.body?.payload || req.body;
        const row = operation === 'get'
            ? await getUserRow(table, user.id, id)
            : operation === 'delete'
            ? await deleteUserRow(table, user.id, id)
            : await updateUserRow(table, user.id, id, payload);
        if (operation === 'get' && !row) return res.json({ row: null, data: null });
        if (!row) return res.status(404).json({ error: 'Record not found.' });
        res.json({ row, data: row });
    } catch (error) { next(error); }
});

app.use('/api/', limiter);
app.use('/api/', validateApiRequest);

// myGAP logbook corrections keep the previous values and a reason, so the
// record stays traceable for audits.
const mapMissingColumn = (error) => (error?.code === '42703'
    ? Object.assign(new Error('Record corrections are being set up. Please try again later.'), { status: 503 })
    : error);

app.post('/api/mygap/logs/:id/correct', async (req, res, next) => {
    try {
        const user = await verifyAuthenticatedUser(req);
        const row = await correctMygapLog(user.id, req.params.id, req.body?.changes, req.body?.reason);
        res.json({ row, data: row });
    } catch (error) { next(mapMissingColumn(error)); }
});

app.post('/api/mygap/logs/:id/delete', async (req, res, next) => {
    try {
        const user = await verifyAuthenticatedUser(req);
        res.json(await deleteMygapLog(user.id, req.params.id, req.body?.reason));
    } catch (error) { next(mapMissingColumn(error)); }
});

app.get('/api/mygap/logs/:id/revisions', async (req, res, next) => {
    try {
        const user = await verifyAuthenticatedUser(req);
        res.json({ revisions: await listMygapLogRevisions(user.id, req.params.id) });
    } catch (error) { next(error); }
});

app.get('/api/reports/summary', async (req, res, next) => {
    try {
        const user = await verifyAuthenticatedUser(req);
        const summary = await getReportSummary(user.id, {
            from: req.query.from,
            to: req.query.to,
            plotId: req.query.plotId,
            timezone: req.query.timezone,
            accessToken: getBearerToken(req),
        });
        res.json(summary);
    } catch (error) { next(error); }
});

app.get('/api/history', async (req, res, next) => {
    try {
        const user = await verifyAuthenticatedUser(req);
        let cursor = null;
        if (req.query.cursor) {
            try { cursor = JSON.parse(Buffer.from(String(req.query.cursor), 'base64url').toString('utf8')); } catch {
                return res.status(400).json({ error: 'Invalid history cursor.' });
            }
        }
        res.json(await getScanHistoryPage(user.id, { cursor, limit: req.query.limit, accessToken: getBearerToken(req) }));
    } catch (error) { next(error); }
});

app.post('/api/sync', async (req, res, next) => {
    try {
        const user = await verifyAuthenticatedUser(req);
        const result = await syncOperation(user.id, req.body);
        res.status(result.conflict ? 409 : 200).json(result);
    } catch (error) { next(error); }
});

app.post('/api/followups', async (req, res, next) => {
    try {
        const user = await verifyAuthenticatedUser(req);
        const result = await createFollowUpEvent(user.id, req.body);
        res.status(201).json(result);
    } catch (error) { next(error); }
});

app.get('/api/followups/:scanId', async (req, res, next) => {
    try {
        const user = await verifyAuthenticatedUser(req);
        res.json(await listFollowUpEvents(user.id, req.params.scanId));
    } catch (error) { next(error); }
});

const aiRoutes = ['/api/analyze', '/api/ask', '/api/assistant', '/api/results/localize', '/api/products/search', '/api/farm'];

app.post('/api/session', (req, res, next) => {
    try {
        const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
        const existing = token ? verifyOrderSession(token) : null;
        res.json(createOrderSession(existing?.guestId));
    } catch (error) { next(error); }
});

const resolveAiIdentity = async (req) => {
    const token = getBearerToken(req);
    if (token) {
        const guest = verifyOrderSession(token);
        if (guest) return `guest:${guest.guestId}`;
        try {
            const user = await verifyAuthenticatedUser(req);
            return `user:${user.id}`;
        } catch { /* IP remains the fallback for unauthenticated callers. */ }
    }
    return `ip:${req.ip || 'unknown'}`;
};

app.use(aiRoutes, async (req, res, next) => {
    if (req.method !== 'POST') return next();
    try {
        req.aiIdentity = await resolveAiIdentity(req);
        next();
    } catch (error) { next(error); }
});

app.use('/api/analyze', async (req, res, next) => {
    if (req.method !== 'POST' || !req.body?.scanId) return next();
    const identity = req.aiIdentity || `ip:${req.ip || 'unknown'}`;
    const scanId = String(req.body.scanId).slice(0, 200);
    try {
        if (!await claimAnalysis({ identity, scanId })) {
            return res.status(202).json({ id: scanId, status: 'processing' });
        }
        const release = () => { releaseAnalysis({ identity, scanId }).catch(() => {}); };
        res.once('finish', release);
        res.once('close', release);
        next();
    } catch (error) { next(error); }
});

app.use(aiRoutes, async (req, res, next) => {
    if (req.method !== 'POST') return next();
    try {
        const quota = await consumeAiQuota({ identity: req.aiIdentity, limit: Number(process.env.AI_IDENTITY_DAILY_LIMIT) || 50 });
        if (!quota.allowed) {
            console.warn(JSON.stringify({ event: 'ai_quota_exceeded', requestId: req.requestId, identity: req.aiIdentity }));
            return res.status(429).json({ error: 'Daily AI usage limit reached. Please try again tomorrow.', requestId: req.requestId });
        }
        next();
    } catch (error) { next(error); }
});
// Daily per-IP and whole-server caps live in Neon so every serverless
// instance shares one count (in-memory limiters reset per instance).
app.use(aiRoutes, async (req, res, next) => {
    if (req.method !== 'POST') return next();
    try {
        const ipQuota = await consumeAiQuota({ identity: `daily-ip:${req.ip || 'unknown'}`, limit: Number(process.env.AI_GUEST_DAILY_LIMIT) || 50 });
        if (!ipQuota.allowed) {
            console.warn(JSON.stringify({ event: 'ai_ip_quota_exceeded', requestId: req.requestId, ip: req.ip }));
            return res.status(429).json({ error: 'Daily AI usage limit reached. Please try again tomorrow.', requestId: req.requestId });
        }
        const serverQuota = await consumeAiQuota({ identity: 'server-total', limit: Number(process.env.AI_SERVER_DAILY_LIMIT) || 1000 });
        if (!serverQuota.allowed) {
            console.warn(JSON.stringify({ event: 'ai_server_quota_exceeded', requestId: req.requestId }));
            return res.status(429).json({ error: 'AI service daily capacity reached. Please try again tomorrow.', requestId: req.requestId });
        }
        next();
    } catch (error) { next(error); }
});
let activeAiRequests = 0;
app.use(aiRoutes, (req, res, next) => {
    if (req.method !== 'POST') return next();
    if (activeAiRequests >= (Number(process.env.AI_MAX_CONCURRENT_REQUESTS) || 4)) {
        return res.status(503).json({ error: 'AI service is busy. Please try again shortly.' });
    }
    activeAiRequests += 1;
    let released = false;
    const release = () => { if (!released) { released = true; activeAiRequests -= 1; } };
    res.once('finish', release);
    res.once('close', release);
    next();
});

// General AI Question Endpoint (Cached)
app.post('/api/ask', async (req, res, next) => {
    const requestController = new AbortController();
    const requestDeadline = setTimeout(() => requestController.abort(new Error('AI request deadline exceeded')), Number(process.env.AI_REQUEST_TIMEOUT_MS) || 120000);
    const abortOnDisconnect = () => requestController.abort(new Error('AI request cancelled by client'));
    req.once?.('aborted', abortOnDisconnect);
    res.once?.('close', abortOnDisconnect);
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

        if (!isAiProviderConfigured()) {
            return res.status(503).json({ error: 'Service Unavailable', message: 'AI provider API key is missing on the server.' });
        }

        // 1. Normalize Cache Key
        const normalizedQuestion = crypto.createHash('sha256').update(question.normalize('NFC').trim()).digest('hex');
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
        const answer = await withAbortableTimeout(
            (signal) => askAI(question, language, recentNotes, recentAlerts, { signal }),
            Number(process.env.AI_QUESTION_TIMEOUT_MS) || 45000,
            { signal: requestController.signal, timeoutMessage: 'AI question timed out' },
        );

        // 4. Save to Cache (7 Days = 604800 seconds)
        const result = { answer, timestamp: Date.now() };
        cacheResult(cacheKey, result, 604800);

        res.json({ ...result, cached: false });

    } catch (error) {
        if (requestController.signal.aborted) {
            const timeoutError = new Error('AI request timed out or was cancelled. Please try again.');
            timeoutError.status = 504;
            next(timeoutError);
        } else next(error);
    } finally {
        clearTimeout(requestDeadline);
        req.removeListener?.('aborted', abortOnDisconnect);
        res.removeListener?.('close', abortOnDisconnect);
    }
});

// Floating help assistant: short answers that link to encyclopedia entries,
// live store products and the support team.
app.post('/api/assistant/chat', async (req, res, next) => {
    const requestController = new AbortController();
    const requestDeadline = setTimeout(() => requestController.abort(new Error('Assistant deadline exceeded')), Number(process.env.AI_QUESTION_TIMEOUT_MS) || 45000);
    const abortOnDisconnect = () => requestController.abort(new Error('Assistant request cancelled by client'));
    req.once?.('aborted', abortOnDisconnect);
    res.once?.('close', abortOnDisconnect);
    try {
        if (!isAiProviderConfigured()) {
            return res.status(503).json({ error: 'ASSISTANT_UNAVAILABLE', message: 'AI provider API key is missing on the server.' });
        }
        const { messages, language = 'en', scanContext } = req.body;
        res.json(await chatWithAssistant({ messages, language, scanContext, signal: requestController.signal }));
    } catch (error) {
        if (requestController.signal.aborted) {
            const timeoutError = new Error('Assistant request timed out or was cancelled. Please try again.');
            timeoutError.status = 504;
            next(timeoutError);
        } else next(error);
    } finally {
        clearTimeout(requestDeadline);
        req.removeListener?.('aborted', abortOnDisconnect);
        res.removeListener?.('close', abortOnDisconnect);
    }
});

// Thumbs up/down on assistant answers. Not an AI route, so it does not use
// the farmer's AI quota; the general API rate limit still applies.
app.post('/api/assistant-feedback', async (req, res, next) => {
    try {
        const { rating, question = '', answer, language = 'en', page, scanStatus } = req.body;
        if (await logAssistantFeedback({ rating, question, answer, language, page, scanStatus })) {
            res.json({ message: 'Feedback received' });
        } else {
            res.status(500).json({ error: 'Failed to log feedback' });
        }
    } catch (error) {
        next(error);
    }
});

// Feedback Endpoint
// Farmer feedback is accepted only from the identity that produced the scan:
// either the signed scan capability returned by /api/analyze, or a signed-in
// account that owns the saved scan. This keeps anonymous callers from
// contaminating another farmer's assessment evidence.
const resolveFeedbackAttribution = async (req, scanId) => {
    const ownerHash = verifyScanCapability(scanId, req.body?.feedbackToken);
    if (ownerHash) return { source: 'farmer', verifiedBy: 'scan_capability', submitterHash: ownerHash };
    if (getBearerToken(req) && !verifyOrderSession(getBearerToken(req))) {
        const user = await verifyAuthenticatedUser(req);
        const owned = await getUserRow('scan_history', user.id, scanId).catch(() => null);
        if (owned) return { source: 'farmer', verifiedBy: 'account', submitterHash: hashIdentity(`user:${user.id}`) };
    }
    return null;
};

// Withdraw consent for one scan's photos. Same proof of ownership as
// feedback; the assessment text is kept, only the photos are deleted.
app.post('/api/scans/:scanId/withdraw-photos', async (req, res, next) => {
    try {
        const scanId = String(req.params.scanId || '');
        if (!/^[a-zA-Z0-9_-]{1,100}$/.test(scanId)) return res.status(400).json({ error: 'Invalid scan ID' });
        if (!await resolveFeedbackAttribution(req, scanId)) {
            return res.status(403).json({
                error: 'WITHDRAWAL_NOT_AUTHORISED',
                message: 'Photos can only be withdrawn from the device or account that ran this scan.',
            });
        }
        const result = await withdrawTrainingImages(scanId);
        res.json({ withdrawn: true, removedPhotos: result?.removed || 0 });
    } catch (error) {
        next(error);
    }
});

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

        const attribution = await resolveFeedbackAttribution(req, String(scanId));
        if (!attribution) {
            return res.status(403).json({
                error: 'FEEDBACK_NOT_AUTHORISED',
                message: 'Feedback can only be sent from the device or account that ran this scan.',
            });
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
        }, { ...attribution, receivedAt: new Date().toISOString() });

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
    const requestController = new AbortController();
    const requestDeadline = setTimeout(() => requestController.abort(new Error('AI request deadline exceeded')), 180000);
    const abortOnDisconnect = () => requestController.abort(new Error('AI request cancelled by client'));
    req.once?.('aborted', abortOnDisconnect);
    res.once?.('close', abortOnDisconnect);
    try {
        // Validation: Critical Keys
        if (!isAiProviderConfigured()) {
            console.error('❌ Request Failed: AI provider API key is missing.');
            return res.status(503).json({
                error: 'Configuration Error',
                message: 'AI provider is not configured on the server.'
            });
        }

        // Fix: Extract treeImage/leafImage to match Frontend Payload (src/utils/diseaseDetection.js)
        // Fallback to 'image' for backward compatibility
        const { treeImage, leafImage, image, category, language = 'en', location, imageQuality = null, dataConsent = null } = req.body;
        // Optional farmer-stated crop; when present it replaces the broad category as the crop hint.
        const farmerCrop = normalizeFarmerCrop(req.body.crop);
        const cropHint = farmerCrop || category;
        const analysisStartedAt = Date.now();

        const mainImage = treeImage || image;

        if (!mainImage) {
            return res.status(400).json({ error: 'Image (treeImage) is required' });
        }

        console.log(`📸 New Analysis Request - Category: ${category}${farmerCrop ? ` (${farmerCrop})` : ''}, Location: ${location || 'Not provided'}`);

        // 1. Generate Image Hash for Caching
        const cacheKey = buildAnalysisCacheKey({ ...req.body, crop: farmerCrop });
        const scanId = req.body.scanId || crypto.randomUUID();
        const callerIdentity = req.aiIdentity || `ip:${req.ip || 'unknown'}`;
        const ownerHash = hashIdentity(callerIdentity);
        const feedbackToken = createScanCapability(scanId, callerIdentity);

        // 2. Check Cache
        const cachedResult = aiCache.get(cacheKey);
        if (cachedResult) {
            console.log('🧠 Image Analysis Cache HIT');
            logTrainingData({ id: scanId, ownerHash, treeImage: mainImage, leafImage, category, dataConsent,
                result: cachedResult, metadata: { language, location, imageQuality, cached: true, durationMs: Date.now() - analysisStartedAt } })
                .catch(err => console.error('Data logging failed:', err.message));
            return res.json({ ...cachedResult, id: scanId, feedbackToken, cached: true });
        }
        console.log('🧠 Image Analysis Cache MISS - Processing...');

        // 3. Identify Species
        let plantNetResult = await withStageTimeout(
            (signal) => identifyPlantWithPlantNet(mainImage, {
                leafImage,
                category: cropHint,
                imageQuality,
                signal,
            }),
            12000,
            null,
            requestController.signal,
        );
        let identificationSource = 'PlantNet';

        // 4. Fallback Identification (GPT Vision)
        if (!plantNetResult) {
            const gptVisionResult = await withStageTimeout(
                (signal) => identifyPlantWithGPTVision(mainImage, cropHint, { signal }),
                12000,
                null,
                requestController.signal,
            );
            if (gptVisionResult) {
                if (gptVisionResult.isPlant === false) {
                    console.warn('⚠️ Image identified as NOT a plant.');
                    return res.status(400).json({
                        error: 'NOT_A_PLANT',
                        message: 'NOT_A_PLANT'
                    });
                }
                gptVisionResult.source = 'GPT-Vision';
                plantNetResult = gptVisionResult;
                identificationSource = 'GPT-Vision';
            }
        }

        if (!plantNetResult) {
            console.warn('⚠️ Both PlantNet and Backup Model failed to identify species');
        }

        // 5. Analyze Health (configured OpenAI primary model). Provider and
        // response failures are classified instead of being reported as
        // timeouts, so farmers see an accurate next step.
        let analysisResult;
        let analysisUsage = null;
        try {
            const tracked = await trackAiUsage(() => withAbortableTimeout(
                (signal) => analyzeWithGPT4Mini(
                    plantNetResult,
                    mainImage,
                    leafImage,
                    cropHint,
                    language,
                    location,
                    imageQuality,
                    { signal },
                ),
                Number(process.env.AI_ANALYSIS_TIMEOUT_MS) || 120000,
                { signal: requestController.signal, timeoutMessage: 'AI pipeline stage timed out' },
            ));
            analysisResult = tracked.result;
            analysisUsage = tracked.usage;
        } catch (analysisError) {
            if (requestController.signal.aborted) throw analysisError;
            const failure = classifyAnalysisFailure(analysisError, language);
            console.warn(JSON.stringify({ event: 'analysis_failed', requestId: req.requestId, code: failure.code, status: failure.status }));
            return res.status(failure.status).json({ error: failure.code, message: failure.message, retryable: failure.retryable, requestId: req.requestId });
        }

        const finalResult = {
            ...analysisResult,
            description: analysisResult.additionalNotes, // Map for PDF compatibility
            identification: plantNetResult,
            identificationSource,
            analysisLanguage: language,
        };

        // Optional research checker: server-only audit data, never result or cache content.
        let decisionShadow;
        try {
            const shadow = await trackAiUsage(() => checkDecisionShadow({
                prediction: finalResult, treeImage: mainImage, leafImage, crop: cropHint,
                dataConsent, signal: requestController.signal,
            }));
            decisionShadow = { ...shadow.result, aiUsage: shadow.usage };
        } catch {
            decisionShadow = { status: 'unavailable', reason: 'checker_failed' };
        }

        if (decisionShadow.status !== 'skipped') {
            console.log(JSON.stringify({ event: 'decision_shadow', requestId: req.requestId,
                status: decisionShadow.status, reason: decisionShadow.reason || null,
                wouldAddReview: decisionShadow.wouldAddReview ?? null,
                durationMs: decisionShadow.durationMs ?? null, costUsd: decisionShadow.costUsd ?? null }));
        }

        if (requestController.signal.aborted) throw new Error('Analysis request cancelled');

        // 6. Cache Result (24 Hours)
        cacheResult(cacheKey, finalResult, 86400);

        // 7. Log Data for Training (Fire & Forget)
        // Fix: Pass single object as expected by dataCollector.js
        logTrainingData({
            id: scanId,
            ownerHash,
            treeImage: mainImage,
            leafImage: leafImage,
            category,
            dataConsent,
            result: finalResult,
            metadata: {
                language,
                location,
                farmerCrop: farmerCrop || null,
                source: identificationSource,
                imageQuality,
                plantNetCandidates: plantNetResult?.allMatches || [],
                confidenceBreakdown: finalResult.confidenceBreakdown || null,
                status: finalResult.status || null,
                differentialDiagnoses: finalResult.differentialDiagnoses || [],
                requestId: req.requestId,
                model: finalResult.analysisMetadata?.model || null,
                policyVersion: finalResult.analysisMetadata?.policyVersion || null,
                durationMs: Date.now() - analysisStartedAt,
                aiUsage: analysisUsage,
                decisionShadow,
            }
        }).catch(err => console.error('Data logging failed:', err));
        console.log(JSON.stringify({ event: 'analysis_usage', requestId: req.requestId, model: finalResult.analysisMetadata?.model || null, ...analysisUsage }));

        res.json({ ...finalResult, id: scanId, feedbackToken });

    } catch (error) {
        if (requestController.signal.aborted) {
            const timeoutError = new Error('Analysis timed out or was cancelled. Please try again.');
            timeoutError.status = 504;
            next(timeoutError);
        } else next(error);
    } finally {
        clearTimeout(requestDeadline);
        req.removeListener?.('aborted', abortOnDisconnect);
        res.removeListener?.('close', abortOnDisconnect);
    }
});

app.post('/api/results/localize', async (req, res, next) => {
    try {
        const { result, language = 'en' } = req.body;

        if (!result || typeof result !== 'object') {
            return res.status(400).json({ error: 'Result object is required' });
        }

        const localized = await localizeStoredAnalysisResult(result, language);
        res.json(localized);
    } catch (error) {
        next(error);
    }
});



// WooCommerce Products Search Endpoint (GPT-5-mini Powered)
app.post('/api/products/search', async (req, res, next) => {
    const requestController = new AbortController();
    const requestDeadline = setTimeout(() => requestController.abort(new Error('Product recommendation deadline exceeded')), Number(process.env.PRODUCT_REQUEST_TIMEOUT_MS) || 90000);
    const abortOnDisconnect = () => requestController.abort(new Error('Product recommendation cancelled by client'));
    req.once?.('aborted', abortOnDisconnect);
    res.once?.('close', abortOnDisconnect);
    try {
        const { diagnosis, language = 'en' } = req.body;
        const targetLanguage = language === 'ms' ? 'ms' : language === 'zh' ? 'zh' : 'en';
        
        if (!diagnosis) {
            return res.status(400).json({ error: 'Diagnosis object is required' });
        }

        if (!isWooCommerceEnabled()) {
            return res.status(503).json({
                error: 'PRODUCT_CATALOG_UNAVAILABLE',
                message: targetLanguage === 'ms'
                    ? 'Katalog produk langsung belum dikonfigurasikan.'
                    : targetLanguage === 'zh'
                        ? '\u5b9e\u65f6\u4ea7\u54c1\u76ee\u5f55\u5c1a\u672a\u914d\u7f6e\u3002'
                        : 'Live product catalog is not configured right now.',
            });
        }
        
        // 1. Fetch all available WooCommerce tags AND categories in parallel
        const [availableTags, availableCategories, diseaseProductRules] = await Promise.all([
            getAllTags({ signal: requestController.signal }),
            getAllCategories({ signal: requestController.signal }),
            getDiseaseProductRules(),
        ]);
        
        if (availableTags.length === 0 && availableCategories.length === 0) {
            return res.status(503).json({
                error: 'PRODUCT_CATALOG_EMPTY',
                message: targetLanguage === 'ms'
                    ? 'Katalog produk langsung belum sedia untuk dipadankan lagi.'
                    : targetLanguage === 'zh'
                        ? '\u5b9e\u65f6\u4ea7\u54c1\u76ee\u5f55\u5c1a\u672a\u51c6\u5907\u597d\u8fdb\u884c\u5339\u914d\u3002'
                        : 'The live product catalog is not ready for matching yet.',
            });
        }
        
        // 2. Match diagnosis keywords to the store taxonomy locally. Product
        // recommendations are deterministic and explainable; diagnosis AI is
        // intentionally kept separate from catalog matching.
        console.log(`🛒 Catalog Recommendation: Matching keywords for "${diagnosis.disease}"...`);
        const recommendation = buildKeywordProductRecommendation(
            diagnosis,
            availableTags,
            availableCategories,
            targetLanguage,
            diseaseProductRules,
        );
        const sectionPolicy = getScanSectionPolicy(diagnosis);
        const treatmentAllowed = canRecommendTreatmentProducts(diagnosis) && sectionPolicy.showDiseaseProducts;
        const safeRecommendation = {
            ...recommendation,
            treatmentTagIds: treatmentAllowed ? recommendation.treatmentTagIds : [],
            treatmentCategoryIds: treatmentAllowed ? recommendation.treatmentCategoryIds : [],
            fertilizerTagIds: sectionPolicy.showNutritionProducts ? recommendation.fertilizerTagIds : [],
            fertilizerCategoryIds: sectionPolicy.showNutritionProducts ? recommendation.fertilizerCategoryIds : [],
            supplementTagIds: sectionPolicy.showNutritionProducts ? recommendation.supplementTagIds : [],
            supplementCategoryIds: sectionPolicy.showNutritionProducts ? recommendation.supplementCategoryIds : [],
        };
        
        // 3. Fetch products for each category in parallel
        const [treatmentProducts, fertilizerProducts, supplementProducts] = await Promise.all([
            getProductsByTagIds(safeRecommendation.treatmentTagIds, safeRecommendation.treatmentCategoryIds, { signal: requestController.signal, searchTerms: safeRecommendation.searchTerms?.treatment || [] }),
            getProductsByTagIds(safeRecommendation.fertilizerTagIds, safeRecommendation.fertilizerCategoryIds, { signal: requestController.signal, searchTerms: safeRecommendation.searchTerms?.fertilizer || [] }),
            getProductsByTagIds(safeRecommendation.supplementTagIds, safeRecommendation.supplementCategoryIds, { signal: requestController.signal, searchTerms: safeRecommendation.searchTerms?.supplement || [] }),
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

        const rawTreatment = finalizeList(treatmentProducts);
        const rawFertilizers = finalizeList(fertilizerProducts);
        const rawSupplements = finalizeList(supplementProducts);
        // Keyword matches alone never make a treatment recommendation: each
        // product also passes basic purpose, crop, restriction and label
        // checks. Unverified matches are returned separately as catalogue
        // discovery so the UI can present them without implying suitability.
        const treatmentSplit = partitionByEligibility(
            sectionPolicy.showDiseaseProducts ? enrichRecommendedProducts(rawTreatment, diagnosis, 'treatment', diseaseProductRules) : [],
            diagnosis, 'treatment', targetLanguage,
        );
        const nutritionList = (products, role) => {
            const split = partitionByEligibility(products, diagnosis, role, targetLanguage);
            return [...split.eligible, ...split.discovery.map(({ discoveryOnly: _discoveryOnly, ...product }) => product)];
        };
        const finalTreatment = treatmentSplit.eligible;
        const catalogueDiscovery = treatmentSplit.discovery.slice(0, 4);
        const finalFertilizers = sectionPolicy.showNutritionProducts
            ? nutritionList(enrichRecommendedProducts(rawFertilizers, diagnosis, 'fertilizer', diseaseProductRules), 'fertilizer')
            : [];
        const finalSupplements = sectionPolicy.showNutritionProducts
            ? nutritionList(enrichRecommendedProducts(rawSupplements, diagnosis, 'supplement', diseaseProductRules), 'supplement')
            : [];
        
        // 5. Choose the product/consultation flow. Disease scans no longer receive arbitrary popular products.
        const otherPopular = [];
        const recommendationIntent = getProductRecommendationIntent(diagnosis, {
            treatmentCount: finalTreatment.length,
            fertilizerCount: finalFertilizers.length,
            supplementCount: finalSupplements.length,
        });
        const consultation = buildProductConsultation(diagnosis, recommendationIntent, targetLanguage);
        let fallbackMeta = null;

        console.log(`✅ Returning: ${finalTreatment.length} treatment, ${finalFertilizers.length} fertilizers, ${finalSupplements.length} supplements, ${otherPopular.length} popular | intent=${recommendationIntent}`);
        
        if (recommendationIntent === PRODUCT_RECOMMENDATION_INTENTS.SUPPORT_ONLY) {
            fallbackMeta = {
                used: true,
                isExploration: false,
                reason: targetLanguage === 'ms'
                    ? 'Diagnosis ini belum cukup kukuh untuk mencadangkan produk rawatan. Hubungi pasukan kami untuk semakan lanjut sebelum membeli atau menggunakan input.'
                    : targetLanguage === 'zh'
                        ? '\u8be5\u8bca\u65ad\u8bc1\u636e\u8fd8\u4e0d\u8db3\uff0c\u6682\u4e0d\u5efa\u8bae\u76f4\u63a5\u9009\u62e9\u6cbb\u7597\u4ea7\u54c1\u3002\u8d2d\u4e70\u6216\u4f7f\u7528\u6295\u5165\u54c1\u524d\uff0c\u8bf7\u5148\u8054\u7cfb\u6211\u4eec\u8fdb\u4e00\u6b65\u6838\u5bf9\u3002'
                        : 'This diagnosis is not strong enough for treatment-product recommendations yet. Contact our team for review before buying or applying inputs.',
            };
        } else if (recommendationIntent === PRODUCT_RECOMMENDATION_INTENTS.CONSULTATION_NEEDED) {
            fallbackMeta = {
                used: true,
                isExploration: false,
                reason: targetLanguage === 'ms'
                    ? 'Kami belum menemui padanan produk rawatan khusus yang selamat untuk diagnosis ini. Hubungi kami untuk cadangan yang lebih tepat.'
                    : targetLanguage === 'zh'
                        ? '\u6211\u4eec\u5c1a\u672a\u627e\u5230\u9002\u5408\u6b64\u8bca\u65ad\u7684\u5b89\u5168\u4e13\u7528\u6cbb\u7597\u4ea7\u54c1\u3002\u8bf7\u8054\u7cfb\u6211\u4eec\u83b7\u53d6\u66f4\u51c6\u786e\u7684\u5efa\u8bae\u3002'
                        : 'We did not find a safe disease-specific product match for this scan. Contact us for a more precise recommendation.',
            };
        }

        const responseBody = {
            diseaseControl: finalTreatment,
            fertilizers: finalFertilizers,
            supplements: finalSupplements,
            otherPopular: otherPopular,
            catalogueDiscovery,
            eligibilitySummary: {
                eligibleTreatments: finalTreatment.length,
                discoveryOnly: treatmentSplit.discovery.length,
                excludedAsUnsuitable: treatmentSplit.excluded,
            },
            reasoning: recommendation.reasoning,
            fallbackMeta,
            recommendationIntent,
            consultation,
            curatedRules: recommendation.curatedRules || [],
            keywords: recommendation.keywords || {},
            storeUrl: getStoreUrl()
        };

        // Record what this farmer was shown, when they prove they own the scan.
        const snapshotOwner = req.body.scanId ? verifyScanCapability(String(req.body.scanId), req.body.feedbackToken) : null;
        if (snapshotOwner) {
            saveRecommendationSnapshot({
                scanId: String(req.body.scanId),
                ownerHash: snapshotOwner,
                snapshot: buildRecommendationSnapshot(responseBody, targetLanguage),
            }).catch((error) => console.warn(JSON.stringify({ event: 'recommendation_snapshot_failed', requestId: req.requestId, message: error.message })));
        }

        res.json(responseBody);
    } catch (error) {
        if (requestController.signal.aborted) {
            const timeoutError = new Error('Product recommendations timed out or were cancelled.');
            timeoutError.status = 504;
            next(timeoutError);
        } else {
            console.error('❌ Product search failed:', error);
            res.status(500).json({ error: 'Failed to search products' });
        }
    } finally {
        clearTimeout(requestDeadline);
        req.removeListener?.('aborted', abortOnDisconnect);
        res.removeListener?.('close', abortOnDisconnect);
    }
});

// ----------------------------------------------------------------------------------
// WOOCOMMERCE GUEST ORDER ENDPOINTS
// ----------------------------------------------------------------------------------

// A signed-in user can ask store staff to recover an older guest order. The
// response is intentionally generic so order numbers cannot be used for
// account enumeration.
app.post('/api/orders/recovery-requests', async (req, res, next) => {
    try {
        const user = await verifyAuthenticatedUser(req);
        const orderNumber = String(req.body?.orderNumber || '').trim();
        const explanation = String(req.body?.explanation || '').trim().slice(0, 500);
        if (!/^\d{1,20}$/.test(orderNumber)) {
            return res.status(400).json({ error: 'Enter a valid order number.' });
        }
        if (!explanation) return res.status(400).json({ error: 'A short explanation is required.' });
        await queryNeon(
            'insert into public.order_recovery_requests(order_id, requester_user_id, explanation, status) values ($1, $2, $3, $4)',
            [orderNumber, user.id, explanation, 'pending'],
        );
        res.status(202).json({ message: 'Your request was received and will be reviewed by the store team.' });
    } catch (error) { next(error); }
});

// Create guest order
app.post('/api/orders/session', (req, res, next) => {
    try {
        const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
        const existing = token ? verifyOrderSession(token) : null;
        res.json(createOrderSession(existing?.guestId));
    } catch (error) { next(error); }
});

app.use('/api/orders', requireOrderSession);

app.post('/api/orders', async (req, res, next) => {
    try {
        const { items, billing, shipping } = req.body;
        const { guestId } = req.orderSession;

        if (!items || !items.length || !guestId) {
            return res.status(400).json({ error: 'Items and guestId are required' });
        }

        const order = await createOrder({ items, billing, shipping, guestId });
        if (!order) return res.status(503).json({ error: 'Order service unavailable' });
        res.status(201).json(summarizeOrder(order));
    } catch (error) {
        console.error('❌ Order creation endpoint failed:', error.message);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Get orders by App ID (localStorage session)
app.get('/api/orders/user/:appId', async (req, res, next) => {
    try {
        const { appId } = req.params;
        if (appId !== req.orderSession.guestId) return res.status(403).json({ error: 'Order access denied' });
        const { ids } = req.query; // Optional comma-separated IDs from frontend

        if (ids) {
            if (typeof ids !== 'string' || !/^\d+(,\d+)*$/.test(ids) || ids.split(',').length > 50) {
                return res.status(400).json({ error: 'Provide at most 50 numeric order IDs' });
            }
            const idArray = ids.split(',');
            const orders = await getOrdersByIds(idArray);
            return res.json(orders.filter(order => ownsOrder(order, req.orderSession.guestId)).map(summarizeOrder));
        }

        const orders = await getOrdersByAppId(appId);
        res.json(orders.filter(order => ownsOrder(order, req.orderSession.guestId)).map(summarizeOrder));
    } catch (error) {
        console.error('❌ Orders fetch endpoint failed:', error.message);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Get single order status
app.get('/api/orders/:orderId', async (req, res, next) => {
    try {
        const { orderId } = req.params;
        if (!/^\d+$/.test(orderId)) return res.status(400).json({ error: 'Invalid order ID' });
        const order = await getOrderStatus(orderId);
        if (!order || !ownsOrder(order, req.orderSession.guestId)) return res.status(404).json({ error: 'Order not found' });
        res.json(summarizeOrder(order));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch order details' });
    }
});

// Admin-only recovery queue. Ownership is written by the server using the
// service role after staff has verified the purchase through the support flow.
app.get('/api/admin/order-recovery-requests', async (req, res, next) => {
    try {
        await verifyAdminRequest(req);
        const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : null;
        const params = [];
        let sql = 'select id,order_id,requester_user_id,explanation,status,reviewer_user_id,reviewed_at,verification_note,created_at from public.order_recovery_requests';
        if (status) { params.push(status); sql += ' where status = $1'; }
        sql += ` order by created_at desc limit ${status ? '$2' : '$1'}`;
        params.push(100);
        const { rows } = await queryNeon(sql, params);
        res.json(Array.isArray(rows) ? rows : []);
    } catch (error) { next(error); }
});

app.post('/api/admin/order-recovery-requests/:requestId/decision', async (req, res, next) => {
    try {
        const reviewer = await verifyAdminRequest(req);
        const decision = String(req.body?.decision || '').toLowerCase();
        const note = String(req.body?.verificationNote || '').trim().slice(0, 1000);
        if (!['approved', 'rejected'].includes(decision) || !note) {
            return res.status(400).json({ error: 'A decision and verification note are required.' });
        }
        const result = await withNeonTransaction(async (client) => {
            const requestResult = await client.query(
                'select id,order_id,requester_user_id,status from public.order_recovery_requests where id = $1 for update',
                [req.params.requestId],
            );
            const request = requestResult.rows[0];
            if (!request || request.status !== 'pending') return null;
            if (decision === 'approved') {
                const existingResult = await client.query('select id,user_id from public.order_refs where order_id = $1 for update', [request.order_id]);
                const existing = existingResult.rows[0];
                if (existing?.user_id && existing.user_id !== request.requester_user_id) {
                    const conflict = new Error('This order already belongs to another account.');
                    conflict.status = 409;
                    throw conflict;
                }
                if (existing?.id) {
                    await client.query('update public.order_refs set user_id = $1, guest_id = null where id = $2', [request.requester_user_id, existing.id]);
                } else {
                    await client.query('insert into public.order_refs(id,order_id,user_id,guest_id) values ($1,$2,$3,null)', [`recovered-${request.order_id}`, request.order_id, request.requester_user_id]);
                }
            }
            await client.query(
                'update public.order_recovery_requests set status = $1, reviewer_user_id = $2, reviewed_at = now(), verification_note = $3 where id = $4 and status = $5',
                [decision, reviewer.id, note, request.id, 'pending'],
            );
            return { status: decision };
        });
        if (!result) return res.status(404).json({ error: 'Recovery request not found.' });
        res.json({ status: decision });
    } catch (error) { next(error); }
});

// ----------------------------------------------------------------------------------
// PHASE 3: FARM INTELLIGENCE ENDPOINTS
// ----------------------------------------------------------------------------------

// 1. AI Agronomist Insights
app.post('/api/farm/insights', async (req, res, next) => {
    const requestController = new AbortController();
    const requestDeadline = setTimeout(() => requestController.abort(new Error('Farm insight deadline exceeded')), Number(process.env.FARM_AI_TIMEOUT_MS) || 90000);
    const abortOnDisconnect = () => requestController.abort(new Error('Farm insight cancelled by client'));
    req.once?.('aborted', abortOnDisconnect);
    res.once?.('close', abortOnDisconnect);
    try {
        const { logs, alerts, harvestData, plots, checklistPct, language = 'en' } = req.body;
        if (!logs || !Array.isArray(logs)) {
            return res.status(400).json({ error: 'logs array is required' });
        }
        const insights = await generateAgronomistInsights(logs, alerts, harvestData, plots, checklistPct, language, { signal: requestController.signal });
        res.json(insights);
    } catch (error) {
        if (requestController.signal.aborted) { const timeoutError = new Error('Farm insights timed out or were cancelled.'); timeoutError.status = 504; next(timeoutError); } else next(error);
    } finally {
        clearTimeout(requestDeadline);
        req.removeListener?.('aborted', abortOnDisconnect);
        res.removeListener?.('close', abortOnDisconnect);
    }
});

// 2. Smart Treatment SOP Generator
app.post('/api/farm/sop', async (req, res, next) => {
    const requestController = new AbortController();
    const requestDeadline = setTimeout(() => requestController.abort(new Error('Farm SOP deadline exceeded')), Number(process.env.FARM_AI_TIMEOUT_MS) || 90000);
    const abortOnDisconnect = () => requestController.abort(new Error('Farm SOP cancelled by client'));
    req.once?.('aborted', abortOnDisconnect);
    res.once?.('close', abortOnDisconnect);
    try {
        const { crop, disease, severity, language = 'en' } = req.body;
        if (!crop || !disease) {
            return res.status(400).json({ error: 'crop and disease are required' });
        }
        const sop = await generateTreatmentSOP(crop, disease, severity, language, { signal: requestController.signal });
        res.json(sop);
    } catch (error) {
        if (requestController.signal.aborted) { const timeoutError = new Error('Farm SOP generation timed out or was cancelled.'); timeoutError.status = 504; next(timeoutError); } else next(error);
    } finally {
        clearTimeout(requestDeadline);
        req.removeListener?.('aborted', abortOnDisconnect);
        res.removeListener?.('close', abortOnDisconnect);
    }
});

// 3. Natural Language Activity Logging
app.post('/api/farm/parse-log', async (req, res, next) => {
    const requestController = new AbortController();
    const requestDeadline = setTimeout(() => requestController.abort(new Error('Farm log parsing deadline exceeded')), Number(process.env.FARM_AI_TIMEOUT_MS) || 90000);
    const abortOnDisconnect = () => requestController.abort(new Error('Farm log parsing cancelled by client'));
    req.once?.('aborted', abortOnDisconnect);
    res.once?.('close', abortOnDisconnect);
    try {
        const { text, language = 'en' } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'text is required' });
        }
        const parsedData = await parseNaturalLanguageLog(text, language, { signal: requestController.signal });
        res.json(parsedData);
    } catch (error) {
        if (requestController.signal.aborted) { const timeoutError = new Error('Farm log parsing timed out or was cancelled.'); timeoutError.status = 504; next(timeoutError); } else next(error);
    } finally {
        clearTimeout(requestDeadline);
        req.removeListener?.('aborted', abortOnDisconnect);
        res.removeListener?.('close', abortOnDisconnect);
    }
});

// 4. Predictive Farm Risk Assessor
app.post('/api/farm/predict', async (req, res, next) => {
    const requestController = new AbortController();
    const requestDeadline = setTimeout(() => requestController.abort(new Error('Farm prediction deadline exceeded')), Number(process.env.FARM_AI_TIMEOUT_MS) || 90000);
    const abortOnDisconnect = () => requestController.abort(new Error('Farm prediction cancelled by client'));
    req.once?.('aborted', abortOnDisconnect);
    res.once?.('close', abortOnDisconnect);
    try {
        const { plots, logs, alerts, location, language = 'en' } = req.body;
        const risk = await generatePredictiveRisk(plots, logs, alerts, location, language, { signal: requestController.signal });
        res.json(risk);
    } catch (error) {
        if (requestController.signal.aborted) { const timeoutError = new Error('Farm risk prediction timed out or was cancelled.'); timeoutError.status = 504; next(timeoutError); } else next(error);
    } finally {
        clearTimeout(requestDeadline);
        req.removeListener?.('aborted', abortOnDisconnect);
        res.removeListener?.('close', abortOnDisconnect);
    }
});

app.get('/api/admin/review-summary', async (req, res, next) => {
    try {
        const adminUser = await verifyAdminRequest(req);
        const summary = await getAdminReviewSummary({
            days: req.query.days,
            limit: req.query.limit,
        });

        res.json({
            ...summary,
            admin: {
                email: adminUser.email,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Expert review workflow (approved reviewers only). Reviews are stored as
// separate attributed records; the original AI assessment is never modified.
app.get('/api/expert/cases', async (req, res, next) => {
    try {
        await verifyReviewerRequest(req);
        res.json(await listReviewQueue({ status: req.query.status, days: req.query.days, limit: req.query.limit }));
    } catch (error) { next(error); }
});

app.get('/api/expert/cases/:scanId', async (req, res, next) => {
    try {
        await verifyReviewerRequest(req);
        res.json(await getReviewCase(req.params.scanId));
    } catch (error) { next(error); }
});

app.post('/api/expert/cases/:scanId/reviews', async (req, res, next) => {
    try {
        const reviewer = await verifyReviewerRequest(req);
        const review = await submitExpertReview(reviewer, req.params.scanId, req.body);
        console.log(JSON.stringify({ event: 'expert_review_recorded', requestId: req.requestId, verdict: review.verdict }));
        res.status(201).json({ review });
    } catch (error) { next(error); }
});

registerFarmerReviewRoutes(app);
registerEvaluationRoutes(app);

// Global Error Handler
app.use((err, req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';
    console.error(JSON.stringify({ event: 'api_error', requestId: req.requestId, method: req.method, path: req.path, status: err.status || 500, message: err.message }));
    if (!err.status || err.status >= 500) captureError(err, { requestId: req.requestId, path: req.path, method: req.method });

    res.status(err.status || 500).json({
        error: isProduction && (!err.status || err.status >= 500) ? 'Internal Server Error' : (err.name || 'Request Error'),
        message: isProduction && (!err.status || err.status >= 500) ? 'An unexpected error occurred. Please try again later.' : err.message,
        requestId: req.requestId,
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
// An uncaught exception or unhandled rejection can leave the process in an
// unknown state. Let the platform replace it in production, while keeping
// local development and tests observable without terminating the runner.
const handleFatalProcessError = (event, error) => {
    console.error(JSON.stringify({
        event,
        message: error?.message || String(error),
        stack: error?.stack,
    }));
    captureError(error instanceof Error ? error : new Error(String(error)), { event });
    if (process.env.NODE_ENV === 'production') {
        flushErrorTracking().finally(() => process.exit(1));
    }
};

process.on('uncaughtException', (error) => handleFatalProcessError('uncaught_exception', error));
process.on('unhandledRejection', (reason) => handleFatalProcessError('unhandled_rejection', reason));

export default app;
