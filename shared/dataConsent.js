// Farmer consent for keeping scan photos to evaluate and improve the AI.
// Opt-in: anything other than an explicit `true` for the current wording is
// treated as no consent. Without consent the assessment text is still kept for
// the normal audit window (expert review, error investigation), but photos are
// not stored and the record is excluded from AI improvement datasets.

// Bump when the consent wording changes so earlier answers are asked again.
export const DATA_CONSENT_VERSION = '2026-11-v1';

export const normalizeDataConsent = (value) => {
    const consented = value?.aiImprovement === true && value?.version === DATA_CONSENT_VERSION;
    return { aiImprovement: consented, version: DATA_CONSENT_VERSION };
};

export const hasAiImprovementConsent = (metadata) => metadata?.dataConsent?.aiImprovement === true;
