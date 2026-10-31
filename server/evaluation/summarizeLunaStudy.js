import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { summarizeDevelopment, developmentReportMarkdown, compareDevelopmentRuns } from './developmentReport.js';
import { summarizeDecisionStudy } from './lunaStudy.js';
const [input,output] = process.argv.slice(2);
if (!output) throw Error('Usage: node server/evaluation/summarizeLunaStudy.js RUN_DIR NEW_REPORT_DIR');
const read = async file => JSON.parse(await readFile(path.join(input,file),'utf8'));
const [plan,diagnoses,decisions,shadow,completion,requests] = await Promise.all([
    read('plan.json'),read('assessments.json'),read('decisions.json'),read('shadow-assessments.json'),read('completion.json'),read('requests.json'),
]);
const report = summarizeDevelopment([...diagnoses,...shadow]);
const decisionSummary = summarizeDecisionStudy(decisions);
const usageByVariant = {};
for (const request of requests.filter(r => r.endpoint === 'chat/completions' && r.completed)) {
    const provider = JSON.parse(await readFile(path.join(input,`${request.id}.provider.json`),'utf8')).response;
    const usage = provider.usage || {};
    const stat = usageByVariant[request.variant] ||= { requests: 0, promptTokens: 0, completionTokens: 0, reasoningTokens: 0, requestsWithReasoningUsage: 0 };
    stat.requests++; stat.promptTokens += usage.prompt_tokens || 0; stat.completionTokens += usage.completion_tokens || 0;
    stat.reasoningTokens += usage.completion_tokens_details?.reasoning_tokens || 0;
    stat.requestsWithReasoningUsage += Number(usage.completion_tokens_details?.reasoning_tokens != null);
}
const models = plan.variants.map(variant => {
    const rows = diagnoses.filter(row => row.runId === variant.id);
    const metrics = summarizeDevelopment(rows).overall;
    const shadowMetrics = summarizeDevelopment(shadow.filter(row => row.runId === `${variant.id}:shadow`)).overall;
    const modelCost = rows.reduce((sum,row) => sum+(row.costUsd || 0),0);
    return { variant: variant.id, tokenUsage: usageByVariant[variant.id] || null, requested: plan.cases.length, metrics, shadowMetrics, modelCost,
        meanChargedUsd: rows.length ? modelCost/rows.length : null,
        missing: plan.checksums.filter(checksum => !rows.some(row => row.checksum === checksum)) };
});
const pairs = plan.variants.slice(1).map(variant => compareDevelopmentRuns(diagnoses,plan.variants[0].id,variant.id));
const assessed = decisionSummary.completed-decisionSummary.review;
const correct = decisionSummary.healthyCorrect+decisionSummary.abnormalCorrect;
const decisionCost = requests.filter(r => r.endpoint === 'decisions').reduce((sum,r) => sum+(r.chargedUsd || 0),0);
let text = `# Luna and Decisions development comparison\n\nSame ${plan.cases.length} source-labelled development images; no retrieval. Crop supplied equally to every model. Dataset labels and matching aliases are unverified, and this is not a field-accuracy estimate.\n\n`;
text += '| Variant | Completed / requested | Top 1 | Top 3 | Review / retake | Missed disease | Treatment-eligible mismatch | Mean seconds | Charged USD |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|\n';
for (const model of models) {
    const m = model.metrics;
    text += `| ${model.variant} | ${m.completed}/${model.requested} | ${m.top1}/${m.completed} | ${m.top3}/${m.completed} | ${m.reviewed}/${m.completed} | ${m.missedDisease}/${m.diseasedReferences} | ${m.incorrectTreatment}/${m.completed} | ${m.meanDurationMs === null ? 'N/A' : (m.meanDurationMs/1000).toFixed(2)} | ${model.modelCost.toFixed(6)} |\n`;
}
text += `\nRecorded reasoning tokens by requested variant: ${models.map(m => `${m.variant}: ${m.tokenUsage?.reasoningTokens ?? 'unavailable'}`).join('; ')}. Reasoning tokens are included in completion-token usage.\n`;
text += `\n## Decisions health triage\n\nCompleted ${decisionSummary.completed}/${plan.cases.length}; failed ${decisionSummary.failed}. Healthy reference images: ${decisionSummary.healthyReferences}; disease-labelled images: ${decisionSummary.diseasedReferences}.\n\n`;
text += `- Healthy correctly classified: ${decisionSummary.healthyCorrect}/${decisionSummary.healthyReferences}.\n- Abnormal correctly classified: ${decisionSummary.abnormalCorrect}/${decisionSummary.diseasedReferences}.\n- Diseased images called healthy: ${decisionSummary.diseasedCalledHealthy}/${decisionSummary.diseasedReferences}.\n- Uncertain or low-confidence triage: ${decisionSummary.review}/${decisionSummary.completed}.\n- Decisive coverage: ${assessed}/${decisionSummary.completed}; correct among decisive outcomes: ${correct}/${assessed}.\n- Mean Decisions request latency: ${decisionSummary.meanDurationMs === null ? 'N/A' : (decisionSummary.meanDurationMs/1000).toFixed(2)+' seconds'}.\n- Charged Decisions cost: US$${decisionCost.toFixed(6)}.\n\n`;
text += '## Shadow-only veto\n\nThese calculations only add review flags; they never upgrade a diagnosis or permit treatment. Latency and cost for the extra checker are reported separately above.\n\n| Variant | Images with a checker result | Review before | Review after | Mismatch treatment before | Mismatch treatment after | Healthy reassurance before | Healthy reassurance after |\n|---|---:|---:|---:|---:|---:|---:|---:|\n';
for (const model of models) {
    const pairedChecksums = new Set(shadow.filter(r => r.runId === `${model.variant}:shadow`).map(r => r.checksum));
    const before = summarizeDevelopment(diagnoses.filter(r => r.runId === model.variant && pairedChecksums.has(r.checksum))).overall;
    const after = model.shadowMetrics;
    text += `| ${model.variant} | ${after.completed} | ${before.reviewed} | ${after.reviewed} | ${before.incorrectTreatment} | ${after.incorrectTreatment} | ${before.completed-before.reviewed-before.treatmentEligible} | ${after.completed-after.reviewed-after.treatmentEligible} |\n`;
}
text += `\n## Execution and limits\n\nStop reason: ${completion.stopped || 'none'}. Charged cost: US$${Number(completion.chargedUsd || 0).toFixed(6)}. Conservative budget accounting: US$${completion.conservativeUsd.toFixed(6)}. Unpriced requests: ${completion.unpricedRequests}.\n\nThresholds were fixed before assessment and are not calibrated probabilities of disease. A second model can repeat the first model's mistake. More reviews can reduce unsafe outputs while reducing useful coverage. These are diagnosis-stage calls, not the complete farmer API, translation or treatment-enrichment flow. Model order was rotated, and no retry or fallback was performed. No production model switch is implied.\n`;
await mkdir(output,{mode:0o700});
const snapshot = Object.fromEntries(await Promise.all(['server/evaluation/summarizeLunaStudy.js','server/evaluation/lunaStudy.js','server/utils/decisionProtocol.js','server/evaluation/developmentReport.js','server/evaluation/datasetLabels.js','server/evaluation/cropNames.js','shared/scanResultPolicy.js'].map(async file => {
    const source = await readFile(file,'utf8');
    return [file,{sha256:createHash('sha256').update(source).digest('hex'),source}];
})));
for (const [file,value] of [['summary.md',text],['summary.json',JSON.stringify({models,decisionSummary,decisionCost,completion,pairs},null,2)],
    ['detailed-report.md',developmentReportMarkdown(report)],['scoring-snapshot.json',JSON.stringify(snapshot,null,2)]]) {
    await writeFile(path.join(output,file),value+'\n',{flag:'wx',mode:0o600});
}
console.log(JSON.stringify({models:models.length,completedDiagnoses:diagnoses.filter(r=>r.completed).length,completedDecisions:decisionSummary.completed,chargedUsd:completion.chargedUsd}));
