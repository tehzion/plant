// Farm assistant: questions, farm-log summaries, care SOPs, natural-language logs and risk forecasts.
// Split out of aiService.js; aiService.js re-exports everything for existing callers.
import { coarseLocation } from '../../../shared/coarseLocation.js';
import fetch from 'node-fetch';
import { withAbortableTimeout } from '../../utils/requestTimeout.js';
import { cleanJsonString, clipText, formatDateForAI, isGenericProductName, translateText } from './shared.js';
import { OPENAI_PRIMARY_MODEL, createChatCompletion } from './client.js';

export function normalizeParsedLogResult(parsed = {}) {
    const normalizedChemical = isGenericProductName(parsed.chemicalName) ? null : parsed.chemicalName;
    return {
        ...parsed,
        chemicalName: normalizedChemical,
    };
}
export function buildAskAIContextSummary(recentNotes = [], recentAlerts = [], language = 'en') {
    const notes = Array.isArray(recentNotes)
        ? [...recentNotes]
            .filter(Boolean)
            .sort((a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0))
            .slice(0, 5)
        : [];

    const alerts = Array.isArray(recentAlerts)
        ? [...recentAlerts]
            .filter(Boolean)
            .sort((a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0))
            .slice(0, 3)
        : [];

    if (notes.length === 0 && alerts.length === 0) return '';

    const noteLabel = translateText(language, {
        en: 'Recent farm notes',
        ms: 'Catatan ladang terkini',
        zh: '近期农场记录',
    });
    const alertLabel = translateText(language, {
        en: 'Active or recent alerts',
        ms: 'Amaran aktif atau terkini',
        zh: '当前或近期预警',
    });

    const noteLines = notes.map((note) => {
        const date = note.created_at || note.timestamp || 'Unknown date';
        const activity = note.activity_type || note.type || 'note';
        const plot = note.plot_id ? ` | plot: ${note.plot_id}` : '';
        const chemical = note.chemical_name ? ` | input: ${note.chemical_name}` : '';
        const disease = note.disease_name_observed ? ` | issue: ${note.disease_name_observed}` : '';
        const text = note.note || note.notes || '';
        return `- ${date} | ${activity}${plot}${chemical}${disease} | ${text}`.trim();
    });

    const alertLines = alerts.map((alert) => {
        const date = alert.created_at || alert.timestamp || 'Unknown date';
        const severity = alert.severity || 'unknown';
        const disease = alert.disease || alert.title || 'Unknown alert';
        const category = alert.category ? ` | crop: ${alert.category}` : '';
        return `- ${date} | ${disease} | severity: ${severity}${category}`;
    });

    return [
        `${noteLabel}:`,
        ...(noteLines.length > 0 ? noteLines : ['- None']),
        '',
        `${alertLabel}:`,
        ...(alertLines.length > 0 ? alertLines : ['- None']),
    ].join('\n');
}
export function summarizeFarmLogsForAI(logs = []) {
    return (Array.isArray(logs) ? logs : [])
        .filter(Boolean)
        .sort((a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0))
        .slice(0, 12)
        .map((log) => ({
            date: formatDateForAI(log.created_at || log.timestamp),
            activity: log.activity_type || log.type || 'note',
            plot: log.plot_id || null,
            chemical: log.chemical_name || null,
            quantity: log.chemical_qty || null,
            diseaseObserved: log.disease_name_observed || null,
            severity: log.scout_severity || null,
            harvestKg: Number.isFinite(Number(log.kg_harvested)) ? Number(log.kg_harvested) : null,
            pricePerKg: Number.isFinite(Number(log.price_per_kg)) ? Number(log.price_per_kg) : null,
            expenseAmount: Number.isFinite(Number(log.expense_amount)) ? Number(log.expense_amount) : null,
            note: clipText(log.note || log.notes || ''),
        }));
}
export function summarizeFarmAlertsForAI(alerts = []) {
    return (Array.isArray(alerts) ? alerts : [])
        .filter(Boolean)
        .sort((a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0))
        .slice(0, 6)
        .map((alert) => ({
            date: formatDateForAI(alert.created_at || alert.timestamp),
            disease: alert.disease || alert.title || 'Unknown alert',
            crop: alert.category || null,
            severity: alert.severity || null,
            status: alert.healthStatus || null,
        }));
}
export function summarizeHarvestDataForAI(harvestData = []) {
    return (Array.isArray(harvestData) ? harvestData : [])
        .filter(Boolean)
        .sort((a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0))
        .slice(0, 8)
        .map((entry) => ({
            date: formatDateForAI(entry.created_at || entry.timestamp),
            plot: entry.plot_id || null,
            crop: entry.cropType || entry.crop_type || null,
            harvestKg: Number.isFinite(Number(entry.kg_harvested)) ? Number(entry.kg_harvested) : null,
            quality: entry.quality_grade || null,
            pricePerKg: Number.isFinite(Number(entry.price_per_kg)) ? Number(entry.price_per_kg) : null,
            // Buyer identity is not required for harvest advice.
        }));
}
export function summarizePlotsForAI(plots = []) {
    return (Array.isArray(plots) ? plots : [])
        .filter(Boolean)
        .slice(0, 8)
        .map((plot) => ({
            name: plot.name || 'Unnamed plot',
            cropType: plot.cropType || plot.crop_type || null,
            area: Number.isFinite(Number(plot.area)) ? Number(plot.area) : null,
            unit: plot.unit || null,
            soilPh: Number.isFinite(Number(plot.soil_ph)) ? Number(plot.soil_ph) : null,
            npk: {
                n: Number.isFinite(Number(plot.npk_n)) ? Number(plot.npk_n) : null,
                p: Number.isFinite(Number(plot.npk_p)) ? Number(plot.npk_p) : null,
                k: Number.isFinite(Number(plot.npk_k)) ? Number(plot.npk_k) : null,
            },
        }));
}
const VALID_RISK_ACTIVITIES = new Set(['spray', 'fertilize', 'prune', 'inspect']);
export function normalizePredictiveRiskResult(result = {}) {
    if (!result || result.hasRisk === false) {
        return {
            hasRisk: false,
            riskLevel: 'none',
        };
    }

    const normalized = {
        hasRisk: Boolean(result.hasRisk),
        riskLevel: ['high', 'moderate', 'none'].includes(result.riskLevel) ? result.riskLevel : 'moderate',
        warningMessage: clipText(result.warningMessage || '', 220),
        suggestedAction: clipText(result.suggestedAction || '', 180),
    };

    const treatment = result.recommendedTreatment && typeof result.recommendedTreatment === 'object'
        ? result.recommendedTreatment
        : null;

    if (!treatment) {
        return normalized;
    }

    let activity = VALID_RISK_ACTIVITIES.has(treatment.activity) ? treatment.activity : 'inspect';
    let chemical = typeof treatment.chemical === 'string' ? treatment.chemical.trim() : '';

    if (isGenericProductName(chemical)) {
        chemical = '';
    }

    if ((activity === 'spray' || activity === 'fertilize') && !chemical) {
        activity = 'inspect';
    }

    normalized.recommendedTreatment = {
        activity,
        chemical: chemical || null,
        prefillAllowed: activity === 'inspect' || Boolean(chemical),
    };

    return normalized;
}
/**
 * Ask general agricultural question
 */
export async function askAI(question, language, recentNotes = [], recentAlerts = [], options = {}) {
    const contextSummary = buildAskAIContextSummary(recentNotes, recentAlerts, language);
    const userPrompt = contextSummary
        ? `Farmer question:\n${question}\n\nRelevant farm context:\n${contextSummary}\n\nUse the context only when it is relevant to the answer.`
        : question;
    const response = await createChatCompletion({
        model: OPENAI_PRIMARY_MODEL,
        messages: [
            {
                role: 'system',
                content: `You are a helpful agricultural expert. Answer the user's question concisely (max 3-4 sentences). 
                ${language === 'ms' ? 'Provide answer in Bahasa Malaysia.' : language === 'zh' ? 'Provide answer in Simplified Chinese (简体中文).' : 'Provide answer in English.'}`
            },
            { role: 'user', content: userPrompt }
        ],
        maxTokens: 300,
        temperature: 0.5,
        signal: options.signal,
    });
    return response.choices[0].message.content;
}
/**
 * ----------------------------------------------------------------------------------
 * PHASE 3 & 4: FARM INTELLIGENCE & MANAGER AI FEATURES
 * ----------------------------------------------------------------------------------
 */

/**
 * 1. AI Agronomist Insights
 * Analyzes recent farm logs, alerts, and harvest data to provide weekly insights.
 */
export async function generateAgronomistInsights(logs, alerts, harvestData, plots = [], checklistPct = 0, language = 'en', options = {}) {
    try {
        console.log('🤖 Generating AI Agronomist Insights...');
        const summarizedPlots = summarizePlotsForAI(plots);
        const summarizedLogs = summarizeFarmLogsForAI(logs);
        const summarizedAlerts = summarizeFarmAlertsForAI(alerts);
        const summarizedHarvests = summarizeHarvestDataForAI(harvestData);
        const response = await createChatCompletion({
            model: OPENAI_PRIMARY_MODEL,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: 'system',
                    content: `You are a virtual agronomist operating in Malaysia. Analyze the farmer's dashboard summary and generate a brief, actionable intelligence report.
Language requirement: ${language === 'ms' ? 'MUST BE IN BAHASA MALAYSIA.' : language === 'zh' ? 'MUST BE IN SIMPLIFIED CHINESE (简体中文).' : 'MUST BE IN ENGLISH.'}
Context rules:
- Farm Plots Context: ${JSON.stringify(summarizedPlots)}. If applicable, use the farm size to estimate pesticide/fertilizer spray volume requirements.
- GAP Compliance Score: ${checklistPct}%. If below 80%, recommend farm hygiene, field training, or record-keeping improvements before advanced solutions.
- Formatting: Always use authentic Malaysian agricultural terminology (e.g., 'Baja Kopi', 'Racun Serangga', 'Musang King', 'SOP GAP').
- Data quality: The dashboard may have sparse logs. Do not invent missing treatments, harvests, or dates.
Output MUST be in the specified language (${language}) and follow this JSON structure: 
- "summary" (A 2-3 sentence overview of farm health and activity summary)
- "recommendations" (Array of 2-3 specific action items based on the data, e.g., "Pruning quality seems low on Plot A, consider structural pruning training")
- "yieldAnalysis" (A 1-2 sentence evaluation of recent harvests and quality grades, e.g., "Musang King yield is up 15% with 80% Grade A quality")`
                },
                {
                    role: 'user',
                    content: `Here is the compact dashboard summary. Logs were pre-filtered from the latest farm activity window before this request.
Logs: ${JSON.stringify(summarizedLogs)}
Active Alerts: ${JSON.stringify(summarizedAlerts)}
Recent Harvests: ${JSON.stringify(summarizedHarvests)}

Generate the insights report in JSON format.`
                }
            ],
            temperature: 0.3,
            maxTokens: 500,
            signal: options.signal,
        });

        const content = cleanJsonString(response.choices[0].message.content);
        return JSON.parse(content);
    } catch (error) {
        console.error('❌ Insight Generation failed:', error.message);
        throw error;
    }
}
/**
 * 2. Smart Treatment SOP Generator
 * Generates an actionable standard operating procedure for a given crop disease.
 */
export async function generateTreatmentSOP(crop, disease, severity, language = 'en', options = {}) {
    try {
        console.log(`🤖 Generating Treatment SOP for ${disease} on ${crop}...`);
        const response = await createChatCompletion({
            model: OPENAI_PRIMARY_MODEL,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: 'system',
                    content: `You are an expert Malaysian agricultural auditor. A farmer needs a Standard Operating Procedure (SOP) to treat a crop issue. 
Language requirement: ${language === 'ms' ? 'MUST BE IN BAHASA MELAYU.' : language === 'zh' ? 'MUST BE IN SIMPLIFIED CHINESE (简体中文).' : 'MUST BE IN ENGLISH.'}
Rules:
1. ONLY recommend active chemical ingredients that are approved by the Malaysian Department of Agriculture (DOA) for this crop.
2. Provide integrated pest management (IPM) non-chemical techniques alongside chemical advice.
3. Use authentic local Malaysian terminology where appropriate (e.g., 'Racun kulat', 'Semburan daun').
Output MUST be a JSON object with:
- "treatmentPlan": Array of strings (3-5 step-by-step instructions)
- "recommendedChemicals": Array of strings (1-3 distinct active ingredients or local pesticide/fungicide names)`
                },
                {
                    role: 'user',
                    content: `Generate a treatment SOP for the following issue:
Crop: ${crop}
Detected Issue/Pest: ${disease}
Severity: ${severity}

Return JSON.`
                }
            ],
            temperature: 0.2,
            maxTokens: 400,
            signal: options.signal,
        });

        const content = cleanJsonString(response.choices[0].message.content);
        return JSON.parse(content);
    } catch (error) {
        console.error('❌ SOP Generation failed:', error.message);
        throw error;
    }
}
/**
 * 3. Natural Language Activity Logging
 * Parses unstructured text into a structured mygap_logs object.
 */
export async function parseNaturalLanguageLog(text, language = 'en', options = {}) {
    try {
        console.log('Farm log enhancement requested');
        const response = await createChatCompletion({
            model: OPENAI_PRIMARY_MODEL,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: 'system',
                    content: `You process unstructured dictate/notes from farmers into a highly structured JSON form schema.
Language of input: ${language}.
STRICT RULES:
1. "type" MUST exactly match one of ["note", "spray", "fertilize", "prune", "inspect", "scout", "harvest"]. Infer the best fit.
2. If the user mentions a local Malaysian term (e.g., "baja" -> fertilize, "racun" -> spray, "tuai" -> harvest), map it to the correct English type value.
3. Only extract values explicitly present in the text. Return null for missing fields.
4. If the farmer only mentions a generic product word like "chemical", "fertilizer", "baja", "organic", "kimia", "racun", "none", or "n/a" without a specific product name, set "chemicalName" to null.
Extract these exact fields (Return JSON):
- "type": String
- "plotId": String (e.g. "Plot A", "Farm 1", "Durian Block")
- "chemicalName": String (e.g. "Mancozeb", "Neem Oil", "NPK 15-15")
- "quantity": String (e.g. "20L", "5kg")
- "kg_harvested": Number (only if type is harvest)
- "price_per_kg": Number (only if type is harvest)
- "quality_grade": "A" | "B" | "C" | "Good" | "Average" | "Poor" (only if type is harvest)
- "buyer_name": String (only if type is harvest)
- "pruned_count": Number (only if type is prune)
- "pruning_type": "Thinning" | "Formative" | "Sanitary" | "Maintenance" (only if type is prune)
- "inspection_type": "Pest/Disease" | "Nutrient" | "Irrigation" | "General" (only if type is inspect)
- "inspection_status": "Good" | "Warning" | "Critical" (only if type is inspect)
- "temperature": Number (e.g. 28)
- "humidity": Number (e.g. 75)
- "disease_name": String (e.g. "Aphids", "Powdery Mildew")
- "severity": "Low" | "Moderate" | "High"
- "expense_amount": Number
- "expense_category": "Fertilizer" | "Pesticide" | "Labor" | "Equipment" | "Other"
- "notes": String (A cleaned up, professional version of the input, e.g. "Sprayed 20L Mancozeb on Plot A" instead of "sprayed 20l mancozeb plot a")`
                },
                {
                    role: 'user',
                    content: `Parse this log: "${text}"`
                }
            ],
            temperature: 0.1,
            maxTokens: 300,
            signal: options.signal,
        });

        const content = cleanJsonString(response.choices[0].message.content);
        const parsed = normalizeParsedLogResult(JSON.parse(content));
        console.log('Farm log enhancement completed');
        return parsed;
    } catch (error) {
        console.error('❌ NLP Parsing failed:', error.message);
        throw error;
    }
}
/**
 * 4. Predictive Farm Risk Assessor
 * Actively monitors recent logs and active alerts to predict imminent threats.
 */
export async function generatePredictiveRisk(plots, logs, alerts, location, language = 'en', options = {}) {
    try {
        let weatherContext = "No live weather data provided.";
        const summarizedPlots = summarizePlotsForAI(plots);
        const summarizedLogs = summarizeFarmLogsForAI(logs);
        const summarizedAlerts = summarizeFarmAlertsForAI(alerts);
        
        const area = coarseLocation(location);
        if (area) {
            try {
                // Fetch next 3 days weather forecast
                const weatherRes = await withAbortableTimeout(
                    (signal) => fetch(`https://api.open-meteo.com/v1/forecast?latitude=${area.lat}&longitude=${area.lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=3`, { signal }),
                    Number(process.env.WEATHER_REQUEST_TIMEOUT_MS) || 10000,
                    { signal: options.signal, timeoutMessage: 'Weather request timed out' },
                );
                if (weatherRes.ok) {
                    const weatherData = await weatherRes.json();
                    weatherContext = `Live Weather Forecast (Next 3 Days - approximate local area):\n`;
                    const daily = weatherData.daily;
                    if (daily && daily.time) {
                        for (let i = 0; i < daily.time.length; i++) {
                            weatherContext += `- Date: ${daily.time[i]}, Max Temp: ${daily.temperature_2m_max[i]}°C, Min Temp: ${daily.temperature_2m_min[i]}°C, Rain: ${daily.precipitation_sum[i]}mm\n`;
                        }
                    }
                }
            } catch (err) {
                if (options.signal?.aborted) throw err;
                console.warn("Failed to fetch open-meteo weather:", err.message);
            }
        }

        console.log('🤖 Running AI Predictive Risk Analysis...');
        const response = await createChatCompletion({
            model: OPENAI_PRIMARY_MODEL,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: 'system',
                    content: `You are a proactive agricultural AI monitor for a Malaysian farm. 
Language: ${language === 'ms' ? 'BAHASA MALAYSIA' : language === 'zh' ? 'SIMPLIFIED CHINESE' : 'ENGLISH'}.
Task: Analyze logs, alerts, farm plots, and incoming live WEATHER FORECAST.
Identify if there is an urgent, imminent risk. Diseases spread faster in high humidity/rain. If heavy rain is forecasted and the farm has recent untreated fungal alerts, escalate the risk severity.
If a high risk exists, generate a short, urgent warning. If the farm is well-managed and currently treated, return {"hasRisk": false}.
Safety rules:
- Prefer inspection or pruning when the evidence is weak.
- Only use a specific chemical or fertilizer name if it is clearly justified by the risk context and crop. Otherwise set "chemical" to null.
- Never use generic product words such as "chemical", "fungicide", "pesticide", "fertilizer", "baja", or "racun" as the chemical name.
Output MUST be a JSON object:
{
  "hasRisk": boolean,
  "riskLevel": "high" | "moderate" | "none",
  "warningMessage": "Short 1-2 sentence alert stating the specific risk (e.g., Heavy rain over next 3 days will rapidly spread active fungal alert)",
  "suggestedAction": "Immediate action required (e.g., 'Apply preventive fungicide before rain', 'Urgent inspection of irrigation system')",
  "recommendedTreatment": {
    "activity": "spray | fertilize | prune | inspect",
    "chemical": "Name of specific chemical/treatment to apply, or null"
  }
}`
                },
                {
                    role: 'user',
                    content: `Data:
Plots: ${JSON.stringify(summarizedPlots)}
Last 14 Days Logs: ${JSON.stringify(summarizedLogs)}
Active Unacknowledged Alerts: ${JSON.stringify(summarizedAlerts)}
${weatherContext}

Determine if an urgent prediction banner should be shown.`
                }
            ],
            temperature: 0.1,
            maxTokens: 300,
            signal: options.signal,
        });

        const content = cleanJsonString(response.choices[0].message.content);
        return normalizePredictiveRiskResult(JSON.parse(content));
    } catch (error) {
        if (options.signal?.aborted) throw error;
        console.error('❌ Predictive Risk Assessment failed:', error.message);
        return { hasRisk: false };
    }
}
