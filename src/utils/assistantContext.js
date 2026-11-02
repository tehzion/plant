// The results page shares the scan it is showing with the floating assistant,
// so a farmer can ask follow-up questions about that scan. The widget lives in
// the layout, so the two talk through this small store instead of props.
let state = { scanContext: null, pageTopic: null, openRequest: 0 };
const listeners = new Set();

const update = (changes) => {
    state = { ...state, ...changes };
    listeners.forEach((listener) => listener());
};

export const getAssistantState = () => state;

export const subscribeAssistant = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const setAssistantScanContext = (context) => update({ scanContext: context || null });

// The encyclopedia category the farmer is browsing, named in starter questions.
export const setAssistantPageTopic = (topic) => update({ pageTopic: topic || null });

export const openAssistant = () => update({ openRequest: state.openRequest + 1 });

const shortList = (value, limit) => (Array.isArray(value) ? value : [])
    .filter((item) => typeof item === 'string' && item.trim())
    .slice(0, limit)
    .map((item) => item.trim().slice(0, 200));

// Only what the assistant needs to answer follow-ups; no images or IDs.
export const buildAssistantScanContext = (result = {}) => ({
    crop: String(result.plantType || '').slice(0, 100),
    diagnosis: String(result.disease || '').slice(0, 200),
    severity: String(result.severity || '').slice(0, 50),
    status: result.requiresRetake ? 'retake' : result.needsReview ? 'review' : result.healthy ? 'healthy' : 'diagnosed',
    symptoms: shortList(result.symptoms, 5),
    nextSteps: shortList(result.immediateActions, 3),
});
