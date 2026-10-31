import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { planLunaStudy, diagnosisRequest, routerDecisionsRequest, parseRouterDecisions, shadowVeto, summarizeDecisionStudy } from './lunaStudy.js';
import { ExperimentBudget } from './developmentExperiments.js';
import { summarizeDevelopment, developmentReportMarkdown, compareDevelopmentRuns } from './developmentReport.js';
import { farmerCategory } from './datasetLabels.js';
import { buildDiagnosisStagePrompt, createModelMessagesWithImages, mergeDiagnosisResult, assessSpeciesIdentification, buildSpeciesContext } from '../services/aiService.js';
import { validateDiagnosisStage } from '../utils/diagnosisValidation.js';

const [splitPath, indexPath, output, ...flags] = process.argv.slice(2);
if (!output) throw Error('Usage: node server/evaluation/runLunaStudy.js SPLIT INDEX NEW_OUTPUT_DIR [--approve-usd=2.74] [--sample=20]');
const read = async file => JSON.parse(await readFile(file, 'utf8'));
const sample = Number(flags.find(f => f.startsWith('--sample='))?.split('=')[1] || 20);
const split = await read(splitPath), index = await read(indexPath);
const basePlan = planLunaStudy(split, index, { sample });
const plan = { ...basePlan, provider: 'openrouter', planId: createHash('sha256').update(JSON.stringify([basePlan.planId,'openrouter'])).digest('hex') };
await mkdir(output, { mode: 0o700 });
const save = async (file, value) => writeFile(path.join(output, file), JSON.stringify(value, null, 2)+'\n', { flag: 'wx', mode: 0o600 });
await save('plan.json', plan);
const approval = flags.find(f => f.startsWith('--approve-usd='));
if (!approval) {
    console.log(JSON.stringify({ status: 'dry_run_no_paid_calls', planId: plan.planId, images: plan.cases.length,
        diagnosisRequests: plan.cases.length*plan.variants.length, decisionsRequests: plan.cases.length }));
    process.exit(0);
}
const limit = Number(approval.split('=')[1]);
if (!Number.isFinite(limit) || limit <= 0 || limit > 2.74) throw Error('Study limit must fit remaining approved budget (maximum US$2.74)');
const budget = new ExperimentBudget(limit);
const key = process.env.OPENROUTER_API_KEY?.trim();
if (!key) throw Error('Existing OpenRouter API key required');
const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const accountUsage = async () => {
    const response = await fetch('https://openrouter.ai/api/v1/key', {headers,signal:AbortSignal.timeout(15000)});
    const data = await response.json();
    if (!response.ok || !Number.isFinite(data.data?.usage)) throw Error('Cannot verify OpenRouter usage');
    return data.data.usage;
};
const initialUsage = await accountUsage();
const catalogs = await Promise.all(['https://openrouter.ai/api/v1/models','https://openrouter.ai/api/v1/models?output_modalities=decisions&input_modalities=image'].map(async url => {
    const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
    if (!response.ok) throw Error('Cannot verify provider model catalog');
    return (await response.json()).data;
}));
const ids=['openai/gpt-5.4-mini','openai/gpt-6-luna','openai/gpt-6-luna-decisions'];
const catalog=ids.map(id=>catalogs.flat().find(m=>m.id===id));
if (catalog.some(m=>!m || !m.architecture?.input_modalities?.includes('image') || Number(m.pricing.prompt)>0.000001 || Number(m.pricing.completion)>0.000005)) throw Error('Model access/pricing changed; inspect before running');
await save('provider-catalog.json',catalog.map(m=>({id:m.id,pricing:m.pricing,architecture:m.architecture,supported_parameters:m.supported_parameters})));
const sources = ['server/evaluation/lunaStudy.js', 'server/evaluation/runLunaStudy.js', 'server/evaluation/developmentExperiments.js',
    'server/evaluation/developmentReport.js', 'server/evaluation/datasetLabels.js', 'server/evaluation/cropNames.js',
    'server/services/aiService.js', 'server/utils/decisionProtocol.js', 'server/utils/diagnosisValidation.js', 'shared/scanResultPolicy.js', 'shared/diseaseAssessment.js'];
const sourceSnapshot = Object.fromEntries(await Promise.all(sources.map(async file => [file, await readFile(file, 'utf8')])));
await save('source-snapshot.json', sourceSnapshot);
await save('run-metadata.json', { planId: plan.planId, startedAt: new Date().toISOString(), approvedUsd: limit,
    sourceHashes: Object.fromEntries(Object.entries(sourceSnapshot).map(([file,text]) => [file,createHash('sha256').update(text).digest('hex')])),
    provider: 'openrouter', initialUsage, settings: { retrieval: false, cropInput: 'farmer-stated source crop', retries: 0,
        treatmentEnrichment: false, maxCompletionTokens: 6000, variantOrder: 'rotated per image', decisionMode: 'shadow only' },
    pricing: { verifiedDate: '2026-10-31', url: 'https://openrouter.ai/api/v1/models', currency: 'USD',
        costType: 'provider-reported usage.cost; account usage checked before each request' },
    priorExperimentsChargedUsd: 0.25033089, note: 'Diagnosis-stage development comparison only; no production or database writes. Thresholds predeclared, not clinically calibrated.' });

let stopped = null;
const diagnoses = [], decisionRows = [], shadowRows = [], requests = [];
const post = async (endpoint, body, identity) => {
    if (!budget.reserve(Math.max(0,(await accountUsage())-initialUsage))) { stopped = 'budget_reserve'; return null; }
    const id = createHash('sha256').update(JSON.stringify([plan.planId,endpoint,identity])).digest('hex');
    await save(`${id}.started.json`, { endpoint, ...identity, startedAt: new Date().toISOString(), requestHash: createHash('sha256').update(JSON.stringify(body)).digest('hex') });
    const start = Date.now();
    let result = { id, endpoint, ...identity, completed: false, estimatedUsd: null, chargedUsd: null, conservativeUsd: budget.reservePerRequest };
    try {
        const response = await fetch(endpoint === 'decisions' ? 'https://openrouter.ai/api/alpha/decisions' : 'https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers,
            body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
        const data = await response.json().catch(() => ({}));
        // Never persist credential-bearing provider error messages.
        const safeData = { ...data, error: data.error ? { code: data.error.code, type: data.error.type, param: data.error.param } : undefined };
        await save(`${id}.provider.json`, { httpStatus: response.status, response: safeData });
        result.httpStatus = response.status;
        if (!response.ok) {
            result.error = `HTTP_${response.status}:${data.error?.code || data.error?.type || 'request_rejected'}`;
            stopped = result.error;
        } else {
            const cost = data.usage?.cost;
            if (typeof cost !== 'number' || !Number.isFinite(cost) || cost < 0) throw Error('Missing charged cost');
            result = { ...result, chargedUsd: cost, conservativeUsd: cost, completed: true, data };
        }
    } catch (error) {
        result.error = error.name === 'TimeoutError' ? 'request_timeout' : 'request_or_usage_processing_failed';
        stopped = result.error;
    }
    budget.settle(result.conservativeUsd);
    result.durationMs = Date.now()-start;
    await save(`${id}.request-result.json`, { ...result, data: undefined });
    requests.push({ ...result, data: undefined });
    return result;
};
const imageUrl = async item => {
    const bytes = await readFile(item.blindImagePath);
    if (bytes.length > 5*1024*1024 || createHash('sha256').update(bytes).digest('hex') !== item.checksum) throw Error('Image integrity/size mismatch');
    const mime = bytes.subarray(0,3).equals(Buffer.from('ffd8ff','hex')) ? 'image/jpeg' : bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')) ? 'image/png' : null;
    if (!mime) throw Error('Unsupported image');
    return `data:${mime};base64,${bytes.toString('base64')}`;
};
try {
    outer: for (const [imageIndex,item] of plan.cases.entries()) {
        const category = farmerCategory(item.crop), language = 'en', userLocation = 'Malaysia';
        const speciesAssessment = assessSpeciesIdentification(null, category);
        const speciesContext = buildSpeciesContext({ speciesAssessment, category, source: 'User category' });
        const args = { plantNetResult: null, speciesAssessment, speciesContext, category, language, userLocation,
            malaysiaCropInfo: null, leafImage: null, imageQuality: null };
        const prompt = buildDiagnosisStagePrompt(args)+`\nFarmer-stated crop: ${JSON.stringify(item.crop)}. This is context, not visual proof. Diagnose the query image independently.`;
        const url = await imageUrl(item);
        const messages = createModelMessagesWithImages(prompt,url,null,speciesContext);
        const candidates = [];
        const rotation = imageIndex % plan.variants.length;
        const variants = [...plan.variants.slice(rotation),...plan.variants.slice(0,rotation)];
        for (const variant of variants) {
            const nativeRequest = diagnosisRequest(variant,messages);
            const result = await post('chat/completions', { ...nativeRequest, model: `openai/${variant.model}`, usage: {include:true} }, { checksum: item.checksum, variant: variant.id });
            if (!result) break outer;
            let prediction, completed = false;
            if (result.completed) {
                try {
                    const raw = result.data.choices?.[0]?.message?.content || '';
                    const stage = JSON.parse(raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''));
                    const issues = validateDiagnosisStage(stage);
                    if (issues.some(i => ['missing_diagnosis','missing_capture_assessment','missing_diagnosis_label'].includes(i))) throw Error('Invalid diagnosis stage');
                    prediction = mergeDiagnosisResult({ ...args, stageOne: stage, stageTwo: null });
                    prediction.analysisMetadata = { provider: 'openrouter', model: result.data.model || variant.model,
                        reasoningEffort: variant.effort, policyVersion: 4, diagnosisAttempts: 1, experimentPlan: plan.planId };
                    completed = true;
                } catch { prediction = { error: 'invalid_or_incomplete_diagnosis_json' }; }
            } else prediction = { error: result.error };
            const row = { checksum: item.checksum, runId: variant.id, source: item.source, crop: item.crop, originalLabel: item.originalLabel,
                completed, prediction, durationMs: result.durationMs, estimatedUsd: result.estimatedUsd,
                costUsd: result.chargedUsd, costBasis: 'OpenRouter usage.cost', references: [] };
            await save(`${result.id}.diagnosis.json`,row);
            diagnoses.push(row);
            if (completed) candidates.push({ row, variant: variant.id, disease: prediction.disease });
            console.log(JSON.stringify({ image: imageIndex+1, variant: variant.id, completed, disease: prediction.disease,
                chargedUsd: result.chargedUsd, conservativeBudgetUsd: budget.spentUsd }));
            if (stopped) break outer;
        }
        const body = routerDecisionsRequest(url,item.crop,candidates);
        const result = await post('decisions',body,{ checksum: item.checksum, variant: 'gpt-6-luna:decisions' });
        if (!result) break;
        let answers = null, completed = false;
        if (result.completed) {
            try { answers = parseRouterDecisions(result.data,Object.keys(body.questions)); completed = true; }
            catch { /* malformed responses remain failed, never healthy */ }
        }
        const row = { checksum: item.checksum, crop: item.crop, originalLabel: item.originalLabel, source: item.source,
            completed, answers, durationMs: result.durationMs, estimatedUsd: null, costUsd: result.chargedUsd,
            error: completed ? null : result.error || 'invalid_decisions_answers' };
        await save(`${result.id}.decisions.json`,row);
        decisionRows.push(row);
        if (completed) {
            for (const [i,candidate] of candidates.entries()) {
                const shadow = shadowVeto(candidate.row.prediction,answers,`support_${i}`);
                shadowRows.push({ ...candidate.row, runId: `${candidate.variant}:shadow`, prediction: shadow.prediction,
                    shadowReasons: shadow.reasons, estimatedUsd: null, costUsd: null });
            }
        }
        console.log(JSON.stringify({ image: imageIndex+1, variant: 'decisions', completed, triage: answers?.health_triage?.choice,
            chargedUsd: result.chargedUsd, conservativeBudgetUsd: budget.spentUsd }));
        if (stopped) break;
    }
} catch (error) { stopped = error.message.startsWith('Image ') ? error.message : 'local_study_execution_failed'; }
const report = summarizeDevelopment([...diagnoses,...shadowRows]);
const decisionsSummary = summarizeDecisionStudy(decisionRows);
const comparisons = plan.variants.slice(1).map(v=>compareDevelopmentRuns(diagnoses,plan.variants[0].id,v.id));
await save('assessments.json',diagnoses);
await save('shadow-assessments.json',shadowRows);
await save('decisions.json',decisionRows);
await save('requests.json',requests);
await save('report.json',report);
await save('decisions-summary.json',decisionsSummary);
await save('paired-comparisons.json',comparisons);
await writeFile(path.join(output,'report.md'),developmentReportMarkdown(report),{ flag: 'wx', mode: 0o600 });
await save('completion.json',{ completedAt: new Date().toISOString(), stopped, requestedImages: plan.cases.length,
    requestedDiagnosisAssessments: plan.cases.length*3, completedDiagnoses: diagnoses.filter(r=>r.completed).length,
    requestedDecisions: plan.cases.length, completedDecisions: decisionRows.filter(r=>r.completed).length,
    chargedUsd: requests.reduce((sum,r)=>sum+(r.chargedUsd || 0),0), conservativeUsd: budget.spentUsd,
    unpricedRequests: requests.filter(r=>r.chargedUsd === null).length, remainingBudgetUsd: Math.max(0,limit-budget.spentUsd),
    noProductionChange: true, reservedImageOverlap: 0 });
console.log(JSON.stringify({ status: stopped || 'complete', diagnoses: diagnoses.length, decisions: decisionRows.length,
    chargedUsd: requests.reduce((sum,r)=>sum+(r.chargedUsd || 0),0), conservativeUsd: budget.spentUsd }));
if (stopped) process.exitCode = 1;
