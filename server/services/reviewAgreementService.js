import { queryNeon } from '../utils/neonDatabase.js';
import { confidencePercent } from '../../shared/scanResultPolicy.js';

const normalize = value => String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
const interval = (n, total) => {
    if (!total) return null;
    const z = 1.96, p = n / total, denominator = 1 + z * z / total;
    const centre = (p + z * z / (2 * total)) / denominator;
    const margin = z / denominator * Math.sqrt(p * (1 - p) / total + z * z / (4 * total * total));
    return { low: Math.max(0, centre - margin), high: Math.min(1, centre + margin) };
};

export const summarizeReviewAgreement = (rows, minimumCases = 20) => {
    const evaluable = rows.filter(row => ['confirmed', 'corrected'].includes(row.verdict) && row.raw_result?.disease && (row.verdict === 'confirmed' || row.corrected_diagnosis));
    let top1 = 0, top3 = 0, wrong = 0;
    const crops = {};
    for (const row of evaluable) {
        const prediction = row.raw_result;
        const expected = normalize(row.verdict === 'confirmed' ? prediction.disease : row.corrected_diagnosis);
        const alternatives = Array.isArray(prediction.differentialDiagnoses) ? prediction.differentialDiagnoses : [];
        const candidates = [...new Set([prediction.disease, ...alternatives.map(item => typeof item === 'string' ? item : item?.name)].map(normalize).filter(Boolean))].slice(0, 3);
        const first = candidates[0] === expected, third = candidates.includes(expected);
        const confidentWrong = !first && (confidencePercent(prediction.diagnosisConfidence ?? prediction.confidence) ?? 0) >= 80;
        top1 += Number(first); top3 += Number(third); wrong += Number(confidentWrong);
        const crop = row.corrected_crop || prediction.plantType || 'Unknown';
        const stat = crops[crop] ||= { cases: 0, top1: 0, top3: 0, confidentlyWrong: 0 };
        stat.cases++; stat.top1 += Number(first); stat.top3 += Number(third); stat.confidentlyWrong += Number(confidentWrong);
    }
    const rates = (n, total) => total >= minimumCases ? { rate: n / total, interval95: interval(n, total) } : null;
    return {
        status: evaluable.length >= minimumCases ? 'reviewed_sample' : 'awaiting_reviews', reviewedCases: rows.length,
        evaluableCases: evaluable.length, uncertainOrIncomplete: rows.length - evaluable.length,
        reviewCoverage: rows.length ? evaluable.length / rows.length : null, minimumCases,
        top1: rates(top1, evaluable.length), top3: rates(top3, evaluable.length), confidentlyWrong: rates(wrong, evaluable.length),
        crops: Object.fromEntries(Object.entries(crops).map(([crop, stat]) => [crop, { ...stat, top1Agreement: rates(stat.top1, stat.cases), top3Agreement: rates(stat.top3, stat.cases) }])),
        note: 'Agreement with the latest expert review of each scan, not independent diagnostic accuracy. Reviewers saw AI outputs; uncertain and incomplete reviews are excluded from agreement rates. Exact normalized names only; no unapproved aliases. Rates are withheld below the minimum sample size.',
    };
};

export const getReviewAgreement = async ({ days = 30 } = {}) => {
    if (!Number.isInteger(days) || days < 1 || days > 366) throw new Error('days must be between 1 and 366');
    const { rows } = await queryNeon(`select * from (
        select distinct on (r.scan_id) r.scan_id, r.verdict, r.corrected_diagnosis, r.corrected_crop, l.raw_result
        from public.diagnosis_expert_reviews r join public.diagnosis_training_logs l on l.id = r.scan_id
        where r.created_at >= now() - ($1::int * interval '1 day') order by r.scan_id, r.created_at desc, r.id desc
    ) latest limit 10001`, [days]);
    if (rows.length > 10000) throw new Error('Use a shorter reporting window (maximum 10,000 reviewed scans).');
    return { generatedAt: new Date().toISOString(), days, ...summarizeReviewAgreement(rows) };
};
