// Small per-device stores for farmer conveniences: answers to follow-up
// questions, remembered myGAP defaults and harvest reminders. All reads and
// writes tolerate unavailable storage so the UI never breaks because of them.
const read = (key, fallback, owner = 'guest:local') => {
    if (!owner) return fallback;
    key = `${key}:${owner}`;
    try {
        const raw = globalThis.localStorage?.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
};
const write = (key, value, owner = 'guest:local') => {
    if (!owner) return false;
    key = `${key}:${owner}`;
    try { globalThis.localStorage?.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
};

const ANSWERS_KEY = 'plant_scan_field_answers';
const LOG_DEFAULTS_KEY = 'plant_mygap_log_defaults';
const HARVEST_KEY = 'plant_harvest_reminders';
const REMINDER_OPT_IN_KEY = 'plant_reminders_opt_in';

export const getFieldAnswers = (scanId, owner = 'guest:local') => (scanId ? read(ANSWERS_KEY, {}, owner)[scanId] || {} : {});

export const saveFieldAnswerWithStatus = (scanId, question, answer, owner = 'guest:local') => {
    if (!scanId || !question) return { answers: {}, saved: false };
    const all = read(ANSWERS_KEY, {}, owner);
    const next = { ...(all[scanId] || {}), [question]: answer };
    // Keep the store bounded: the 100 most recently answered scans.
    const entries = Object.entries({ ...all, [scanId]: { ...next, _at: Date.now() } })
        .sort(([, a], [, b]) => (b._at || 0) - (a._at || 0)).slice(0, 100);
    return { answers: next, saved: write(ANSWERS_KEY, Object.fromEntries(entries), owner) };
};

export const saveFieldAnswer = (...args) => saveFieldAnswerWithStatus(...args).answers;

export const LOG_DEFAULT_FIELDS = ['plot_id', 'crop', 'operator'];
export const getLogDefaults = (owner = 'guest:local') => read(LOG_DEFAULTS_KEY, {}, owner);
export const rememberLogDefaults = (entry = {}, owner = 'guest:local') => write(LOG_DEFAULTS_KEY, Object.fromEntries(
    LOG_DEFAULT_FIELDS.map((field) => [field, entry[field] || '']).filter(([, value]) => value),
), owner);

export const getHarvestReminders = (owner = 'guest:local') => read(HARVEST_KEY, [], owner);
export const addHarvestReminder = ({ date, name }, owner = 'guest:local') => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return false;
    const reminders = getHarvestReminders(owner).filter((item) => !(item.date === date && item.name === name));
    return write(HARVEST_KEY, [...reminders, { id: `${date}-${Date.now()}`, date, name: String(name || '').slice(0, 120) }].slice(-50), owner);
};
export const dismissHarvestReminder = (id, owner = 'guest:local') => write(HARVEST_KEY, getHarvestReminders(owner).filter((item) => item.id !== id), owner);

export const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const dueHarvestReminders = (now = new Date(), owner = 'guest:local') => getHarvestReminders(owner).filter((item) => item.date <= localDateKey(now));

export const getReminderOptIn = (owner = 'guest:local') => read(REMINDER_OPT_IN_KEY, false, owner) === true;
export const setReminderOptIn = (value, owner = 'guest:local') => write(REMINDER_OPT_IN_KEY, Boolean(value), owner);
