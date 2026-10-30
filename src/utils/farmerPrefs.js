// Small per-device stores for farmer conveniences: answers to follow-up
// questions, remembered myGAP defaults and harvest reminders. All reads and
// writes tolerate unavailable storage so the UI never breaks because of them.
const read = (key, fallback) => {
    try {
        const raw = globalThis.localStorage?.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
};
const write = (key, value) => {
    try { globalThis.localStorage?.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
};

const ANSWERS_KEY = 'plant_scan_field_answers';
const LOG_DEFAULTS_KEY = 'plant_mygap_log_defaults';
const HARVEST_KEY = 'plant_harvest_reminders';
const REMINDER_OPT_IN_KEY = 'plant_reminders_opt_in';

export const getFieldAnswers = (scanId) => (scanId ? read(ANSWERS_KEY, {})[scanId] || {} : {});

export const saveFieldAnswer = (scanId, question, answer) => {
    if (!scanId || !question) return {};
    const all = read(ANSWERS_KEY, {});
    const next = { ...(all[scanId] || {}), [question]: answer };
    // Keep the store bounded: the 100 most recently answered scans.
    const entries = Object.entries({ ...all, [scanId]: { ...next, _at: Date.now() } })
        .sort(([, a], [, b]) => (b._at || 0) - (a._at || 0)).slice(0, 100);
    write(ANSWERS_KEY, Object.fromEntries(entries));
    return next;
};

export const LOG_DEFAULT_FIELDS = ['plot_id', 'crop', 'operator'];
export const getLogDefaults = () => read(LOG_DEFAULTS_KEY, {});
export const rememberLogDefaults = (entry = {}) => write(LOG_DEFAULTS_KEY, Object.fromEntries(
    LOG_DEFAULT_FIELDS.map((field) => [field, entry[field] || '']).filter(([, value]) => value),
));

export const getHarvestReminders = () => read(HARVEST_KEY, []);
export const addHarvestReminder = ({ date, name }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return false;
    const reminders = getHarvestReminders().filter((item) => !(item.date === date && item.name === name));
    return write(HARVEST_KEY, [...reminders, { id: `${date}-${Date.now()}`, date, name: String(name || '').slice(0, 120) }].slice(-50));
};
export const dismissHarvestReminder = (id) => write(HARVEST_KEY, getHarvestReminders().filter((item) => item.id !== id));

export const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const dueHarvestReminders = (now = new Date()) => getHarvestReminders().filter((item) => item.date <= localDateKey(now));

export const getReminderOptIn = () => read(REMINDER_OPT_IN_KEY, false) === true;
export const setReminderOptIn = (value) => write(REMINDER_OPT_IN_KEY, Boolean(value));
