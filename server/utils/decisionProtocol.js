import { assessScanDecision, getScanSectionPolicy } from '../../shared/scanResultPolicy.js';

export const SIGN_QUESTIONS = Object.freeze({
    paleStippling: 'Are fine pale stipples, speckles or webbing visible on the leaf, consistent with possible mite damage?',
    powderyFilm: 'Is a white or grey powdery surface film visible on the leaf?',
    blotchyMottling: 'Is uneven yellow or pale mottling visible on the leaf?',
    smallSpots: 'Are discrete brown, dark or necrotic spots visible on the leaf?',
    velvetySpots: 'Are olive, velvety or mould-like leaf patches visible?',
    curlingOrDistortion: 'Is leaf curling, distortion or abnormal deformation visible?',
});
export const SHADOW_THRESHOLDS = Object.freeze({ clarity: 0.7, abnormal: 0.7, support: 0.7, triageConfidence: 0.7 });

export function decisionsRequest(imageUrl, crop, candidates) {
    const questions = [
        { type: 'predicate', name: 'clear_enough', instructions: 'Is the image clear, well-lit and close enough to inspect the leaf surface for spots, stippling and powdery growth? Judge capture quality, not whether you know a diagnosis.' },
        { type: 'predicate', name: 'visible_abnormality', instructions: 'Are visible abnormal leaf symptoms present, including spots, lesions, powdery growth, pale stippling, yellow mottling or distortion? Do not assume disease just because a farmer took a photograph.' },
        ...Object.entries(SIGN_QUESTIONS).map(([name, instructions]) => ({ type: 'predicate', name, instructions })),
        { type: 'choice', name: 'health_triage', instructions: 'Choose the visible health state from the image. Use unclear when subtle disease cannot be excluded or the photograph is insufficient. A healthy answer requires clearly visible normal leaf tissue.', choices: [
            { value: 'healthy', description: 'Clearly normal visible leaf tissue, no visible abnormal signs.' },
            { value: 'abnormal', description: 'Visible symptoms consistent with a disease, pest, nutrient or environmental problem.' },
            { value: 'unclear', description: 'Image or visible evidence is insufficient to distinguish healthy from abnormal.' },
        ] },
        ...candidates.map((candidate, i) => ({ type: 'predicate', name: `support_${i}`, instructions: `Does the image provide visible evidence supporting this proposed primary assessment: ${JSON.stringify(candidate.disease)}? Evaluate only visible symptoms, not the proposing model's authority. If it says no issues, require clear normal tissue and no visible abnormal signs. A plausible disease name without distinguishing visible evidence is not supported.` })),
    ];
    return { model: 'gpt-6-luna', input: [{ role: 'user', content: [
        { type: 'input_text', text: `Inspect this farmer image independently. Farmer-stated crop: ${JSON.stringify(crop)}. Crop identity is context, not evidence of a disease. No reference diagnosis is provided.` },
        { type: 'input_image', image_url: imageUrl, detail: 'auto' },
    ] }], questions, prompt_cache_options: { mode: 'explicit' } };
}

export function parseDecisions(data, questionNames) {
    if (!Array.isArray(data?.answers) || data.answers.length !== questionNames.length) throw Error('Missing Decisions answers');
    const seen = new Set();
    const answers = {};
    for (const answer of data.answers) {
        if (!questionNames.includes(answer.name) || seen.has(answer.name)) throw Error('Unknown or duplicate Decisions answer');
        seen.add(answer.name);
        const probability = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
        if (answer.name !== 'health_triage' && answer.type === 'predicate' && probability(answer.probability)) answers[answer.name] = { name: answer.name, type: 'predicate', probability: answer.probability };
        else if (answer.name === 'health_triage' && answer.type === 'choice' && ['healthy','abnormal','unclear'].includes(answer.choice) && probability(answer.confidence)) answers[answer.name] = { name: answer.name, type: 'choice', choice: answer.choice, confidence: answer.confidence };
        else if (answer.type === 'refusal') answers[answer.name] = { name: answer.name, type: 'refusal' };
        else throw Error('Invalid Decisions answer');
    }
    return answers;
}

/** Research-only veto: never upgrades confidence or unlocks treatment/healthy reassurance. */
export function shadowVeto(prediction, answers, supportName) {
    const reasons = [];
    const predicate = name => answers?.[name]?.type === 'predicate' ? answers[name].probability : null;
    if (predicate('clear_enough') === null || predicate('clear_enough') < SHADOW_THRESHOLDS.clarity) reasons.push('unclear_capture');
    if (predicate(supportName) === null || predicate(supportName) < SHADOW_THRESHOLDS.support) reasons.push('insufficient_diagnosis_support');
    const triage = answers?.health_triage;
    if (triage?.type !== 'choice' || triage.confidence < SHADOW_THRESHOLDS.triageConfidence || triage.choice === 'unclear') reasons.push('unclear_health_triage');
    const before = assessScanDecision(prediction);
    if (before.treatmentEligible && triage?.type === 'choice' && triage.confidence >= SHADOW_THRESHOLDS.triageConfidence && triage.choice === 'healthy') reasons.push('diagnosis_health_disagreement');
    if (before.healthy && (predicate('visible_abnormality') === null || predicate('visible_abnormality') >= SHADOW_THRESHOLDS.abnormal
        || Object.keys(SIGN_QUESTIONS).some(name => predicate(name) === null || predicate(name) >= SHADOW_THRESHOLDS.abnormal)
        || triage?.choice !== 'healthy')) reasons.push('healthy_disagreement');
    return { prediction: reasons.length ? { ...prediction, needsReview: true, expertReviewRequired: true } : { ...prediction }, reasons };
}

/**
 * The veto applied to farmers' results in enforce mode. It only ever adds review, and only on
 * clear evidence: on the Decisions study it removed both label-mismatched treatment calls while
 * keeping healthy reassurance, which the research veto above cut from 3 to 1 because the
 * checker rarely says "healthy" outright. So a missing or "unclear" answer never vetoes here;
 * a confident contrary answer does.
 */
export function enforcementVeto(prediction, answers, supportName, alternativeNames = []) {
    const reasons = [];
    const supportedAlternatives = [];
    const predicate = name => answers?.[name]?.type === 'predicate' ? answers[name].probability : null;
    const at = (value, threshold) => value !== null && value >= threshold;
    const triage = answers?.health_triage?.type === 'choice' ? answers.health_triage : null;
    const triageSays = choice => triage?.choice === choice && triage.confidence >= SHADOW_THRESHOLDS.triageConfidence;
    const before = assessScanDecision(prediction);
    // Fertiliser and supplement suggestions rest on the diagnosis too, so they get the same check.
    const productsShown = !before.healthy && getScanSectionPolicy(prediction).showNutritionProducts;
    if (before.treatmentEligible || productsShown) {
        const support = predicate(supportName);
        const clarity = predicate('clear_enough');
        if (clarity !== null && clarity < SHADOW_THRESHOLDS.clarity) reasons.push('unclear_capture');
        if (support !== null && support < SHADOW_THRESHOLDS.support) reasons.push('insufficient_diagnosis_support');
        if (triageSays('healthy')) reasons.push('diagnosis_health_disagreement');
        for (const [name, label] of alternativeNames) {
            const value = predicate(name);
            if (at(value, SHADOW_THRESHOLDS.support) && (support === null || value > support)) supportedAlternatives.push(label);
        }
        if (supportedAlternatives.length) reasons.push('alternative_better_supported');
    }
    if (before.healthy && (at(predicate('visible_abnormality'), SHADOW_THRESHOLDS.abnormal)
        || Object.keys(SIGN_QUESTIONS).some(name => at(predicate(name), SHADOW_THRESHOLDS.abnormal))
        || triageSays('abnormal'))) reasons.push('healthy_disagreement');
    if (!reasons.length) return { prediction: { ...prediction }, reasons, supportedAlternatives };
    return { prediction: { ...prediction, needsReview: true, expertReviewRequired: true, secondCheck: { applied: true } },
        reasons, supportedAlternatives };
}

/** OpenRouter's alpha Decisions protocol differs from the native OpenAI protocol. */
export function routerDecisionsRequest(imageUrl, crop, candidates) {
    const native = decisionsRequest(imageUrl,crop,candidates);
    return { model: 'openai/gpt-6-luna-decisions',
        state: [native.input[0].content[0].text, { type: 'image_url', image_url: { url: imageUrl, detail: 'auto' } }],
        questions: Object.fromEntries(native.questions.map(q => [q.name, q.type === 'predicate'
            ? { type: 'noul', instructions: q.instructions }
            : { type: 'choice', instructions: q.instructions, criteria: Object.fromEntries(q.choices.map(c => [c.value,c.description])) }])) };
}
export function parseRouterDecisions(data, names) {
    if (!data?.answers || typeof data.answers !== 'object' || Array.isArray(data.answers)) throw Error('Expected OpenRouter Decisions answer map');
    const normalized = Object.entries(data.answers).map(([name,answer]) => {
        if (answer?.type === 'noul') return { name, type: 'predicate', probability: answer.noul };
        if (answer?.type === 'choice') return { name, ...answer };
        if (answer?.type === 'refusal') return { name, type: 'refusal' };
        return { name, type: 'invalid' };
    });
    return parseDecisions({ answers: normalized },names);
}
