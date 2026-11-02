// Maps raw PlantVillage / PlantDoc labels to comparison terms. Reference labels stay unchanged in Neon;
// these terms are only used to compare an AI prediction against them after the assessment returns.
const ALIASES = {
    'haunglongbing': ['huanglongbing', 'citrus greening', 'hlb'],
    'citrus greening': ['huanglongbing', 'citrus greening', 'hlb'],
    'esca': ['esca', 'black measles'],
    'black measles': ['esca', 'black measles'],
    'common rust': ['common rust', 'rust'],
    'rust': ['rust'],
    'cedar apple rust': ['cedar apple rust', 'rust'],
    'cercospora leaf spot gray leaf spot': ['cercospora', 'gray leaf spot', 'grey leaf spot'],
    'gray leaf spot': ['cercospora', 'gray leaf spot', 'grey leaf spot'],
    'spider mites two spotted spider mite': ['spider mite'],
    'tomato yellow leaf curl virus': ['yellow leaf curl'],
    'yellow virus': ['yellow leaf curl'],
    'mosaic virus': ['mosaic'],
    'mold': ['leaf mold', 'leaf mould'],
    'leaf mold': ['leaf mold', 'leaf mould'],
    'leaf blight': ['leaf blight', 'isariopsis'],
    'isariopsis leaf spot': ['leaf blight', 'isariopsis'],
    'northern leaf blight': ['northern leaf blight', 'northern corn leaf blight', 'turcicum'],
    'blight': ['blight'],
    'scab': ['scab'],
};
const CROP_WORDS = /\b(apple|bell|pepper|corn|maize|grape|potato|tomato|leaf|squash|soybean|cherry|peach|orange|strawberry|blueberry|raspberry)\b/g;
const clean = (value) => String(value || '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

export function referenceTerms(label) {
    const raw = clean(label);
    if (raw === 'healthy' || raw.replace(CROP_WORDS, '').replace(/\s+/g, ' ').trim() === 'healthy') return { healthy: true, terms: [] };
    const parts = [raw.replace(/\(.*?\)/g, ''), ...[...raw.matchAll(/\((.*?)\)/g)].map(m => m[1])]
        .map(part => part.replace(CROP_WORDS, '').replace(/[()]/g, '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    const terms = new Set(parts);
    // Look aliases up on the label both before and after crop words are stripped.
    const unstripped = [raw.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim(), ...[...raw.matchAll(/\((.*?)\)/g)].map(m => m[1].trim())];
    for (const part of [...parts, ...unstripped]) for (const alias of ALIASES[part] || []) terms.add(alias);
    // Predictions are compared with "leaf" removed, so remove it from the terms too.
    return { healthy: false, terms: [...terms].map(t => t.replace(/\bleaf\b/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean) };
}

export function compareCondition(label, prediction, needsReview) {
    if (!prediction?.disease) return 'unassessed';
    if (needsReview) return 'uncertain_or_review';
    const ref = referenceTerms(label);
    if (ref.healthy) return prediction.healthStatus === 'healthy' ? 'match' : prediction.healthStatus === 'unhealthy' ? 'different_or_unclear' : 'unassessed';
    // Labels have "leaf" stripped as a crop-ish filler word, so strip it from the prediction too.
    const predicted = clean(prediction.disease).replace(/\bleaf\b/g, '').replace(/\s+/g, ' ');
    return ref.terms.some(term => predicted.includes(term)) ? 'match' : 'different_or_unclear';
}

export function farmerCategory(crop) {
    if (/corn|maize/i.test(crop)) return 'Corn';
    if (/tomato|potato|pepper|squash|soybean/i.test(crop)) return 'Vegetables';
    return 'Fruits';
}
