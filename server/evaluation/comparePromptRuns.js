// Compares two dataset runs on the same images (for example the current
// prompt against a changed one). Read-only on the isolated evaluation branch.
// Usage: node --env-file=.env.evaluation.local server/evaluation/comparePromptRuns.js BASE_RUN[,MORE] NEW_RUN[,MORE]
// Several run IDs joined by commas count as one run (for a run resumed under a new ID).
import pg from 'pg';
import { compareCondition, referenceTerms } from './datasetLabels.js';
import { assessScanDecision } from '../../shared/scanResultPolicy.js';

const [baseRun, newRun] = process.argv.slice(2);
const baseIds = String(baseRun || '').split(','), newIds = String(newRun || '').split(',');
if (!baseRun || !newRun) throw Error('Usage: comparePromptRuns.js BASE_RUN NEW_RUN');
const host = process.env.EVALUATION_DATABASE_HOST;
if (!host || new URL(process.env.DATABASE_URL).hostname !== host) throw Error('Isolated evaluation database required');

const GENERIC = /^(fungal |bacterial )?(leaf spot|leaf blight|blight|spot|chlorosis|rust|leaf curl|viral mosaic|mosaic)$/i;
const HEDGE = /\b(likely|possible|possibly|probable|suspected)\b|\//i;
const TECH = /\b(necrotic|necrosis|lesions?|chlorosis|chlorotic|halo|sporulation|pustules?)\b/i;

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const { rows } = await client.query(`select a.run_id, a.image_checksum, a.completed, a.response, i.crop, i.original_label
    from public.agricultural_dataset_assessments a join public.agricultural_reference_images i on i.checksum = a.image_checksum
    where a.run_id = any($1::text[])`, [[...baseIds, ...newIds]]);
await client.end();

const byRun = { [baseRun]: new Map(), [newRun]: new Map() };
for (const row of rows) if (row.completed) byRun[baseIds.includes(row.run_id) ? baseRun : newRun].set(row.image_checksum, row);
const shared = [...byRun[baseRun].keys()].filter((key) => byRun[newRun].has(key));

const score = (row) => {
    const payload = row.response || {};
    const healthyLabel = referenceTerms(row.original_label).healthy;
    const top1 = compareCondition(row.original_label, payload, false) === 'match';
    const top3 = top1 || (payload.differentialDiagnoses || []).some((d) => compareCondition(row.original_label, { disease: d?.name, healthStatus: 'unhealthy' }, false) === 'match');
    const decision = assessScanDecision(payload);
    const farmerText = [...(payload.symptoms || []), payload.additionalNotes || ''].join(' ');
    return {
        healthyLabel, top1, top3,
        generic: !healthyLabel && GENERIC.test(String(payload.disease || '').trim()),
        hedged: HEDGE.test(String(payload.disease || '')),
        confidentWrong: Boolean(decision.treatmentEligible) && !healthyLabel && !top1,
        treatmentEligible: Boolean(decision.treatmentEligible),
        missedAsHealthy: !healthyLabel && payload.healthStatus === 'healthy',
        healthyCalledSick: healthyLabel && payload.healthStatus === 'unhealthy',
        review: Boolean(decision.needsReview || decision.requiresRetake),
        technicalWords: TECH.test(farmerText),
        disease: payload.disease, confidence: payload.diagnosisConfidence ?? payload.confidence,
    };
};

const totals = (run) => {
    const scored = shared.map((key) => score(byRun[run].get(key)));
    const diseased = scored.filter((s) => !s.healthyLabel).length;
    const count = (field) => scored.filter((s) => s[field]).length;
    return { images: scored.length, diseased, top1: count('top1'), top3: count('top3'), generic: count('generic'), hedged: count('hedged'),
        treatmentEligible: count('treatmentEligible'), confidentWrong: count('confidentWrong'), missedAsHealthy: count('missedAsHealthy'),
        healthyCalledSick: count('healthyCalledSick'), review: count('review'), technicalWords: count('technicalWords') };
};

console.log(JSON.stringify({ baseRun, newRun, missingInEither: rows.length ? Math.max(byRun[baseRun].size, byRun[newRun].size) - shared.length : 0 }));
console.log(JSON.stringify({ base: totals(baseRun) }));
console.log(JSON.stringify({ new: totals(newRun) }));
for (const key of shared) {
    const base = score(byRun[baseRun].get(key)), next = score(byRun[newRun].get(key)), row = byRun[newRun].get(key);
    console.log(JSON.stringify({ crop: row.crop, label: row.original_label, base: `${base.disease} (${base.confidence})${base.top1 ? ' ✓' : base.top3 ? ' top3' : ''}${base.confidentWrong ? ' WRONG-TREAT' : ''}`,
        new: `${next.disease} (${next.confidence})${next.top1 ? ' ✓' : next.top3 ? ' top3' : ''}${next.confidentWrong ? ' WRONG-TREAT' : ''}` }));
}
