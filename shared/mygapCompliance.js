// myGAP record rules shared by the app and the report. They describe what the
// farm records can actually show; they never decide that a farm is compliant.

export const MYGAP_CHECKLIST_IDS = Object.freeze(['check1', 'check2', 'check3', 'check4', 'check5', 'check6', 'check7', 'check8']);
export const NOT_APPLICABLE = 'na';
export const MAX_PHI_DAYS = 3650;

const DAY_MS = 86400000;

const text = (value) => String(value ?? '').trim();
const normalizeKey = (value) => text(value).toLowerCase().replace(/\s+/g, ' ');

export const parseLocalDate = (value) => {
    if (!value) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
    const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const logActivityDate = (log = {}) => parseLocalDate(log.activity_date || log.timestamp || log.created_at);

export const parsePhiDays = (value) => {
    const normalized = String(value ?? '').trim();
    if (!normalized || !/^\d+$/.test(normalized)) return null;
    const days = Number(normalized);
    return Number.isInteger(days) && days >= 0 && days <= MAX_PHI_DAYS ? days : null;
};

/** Adds whole calendar days (DST-safe) to the start of the given day. */
export const addDays = (from, days) => {
    const date = new Date(from);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return date;
};

/** The first date the crop on that plot may be harvested after this spray. */
export const safeHarvestDateFor = (log = {}) => {
    if (log.type !== 'pesticide') return null;
    const days = parsePhiDays(log.phi_days);
    const applied = logActivityDate(log);
    if (days === null || !applied) return null;
    return addDays(applied, days);
};

const samePlot = (a, b) => {
    const left = normalizeKey(a.plot_id);
    const right = normalizeKey(b.plot_id);
    return Boolean(left) && left === right;
};

/**
 * Harvests recorded on a plot before the waiting period of an earlier spray on
 * the same plot had ended. Each conflict names the harvest, the spray and the
 * date harvesting became safe.
 */
export const findPhiConflicts = (logs = []) => {
    const sprays = logs.filter((log) => safeHarvestDateFor(log));
    return logs
        .filter((log) => log.type === 'harvest' && logActivityDate(log))
        .flatMap((harvest) => {
            const harvestDate = logActivityDate(harvest);
            return sprays
                .filter((spray) => samePlot(spray, harvest))
                .filter((spray) => logActivityDate(spray) <= harvestDate && safeHarvestDateFor(spray) > harvestDate)
                .map((spray) => ({ harvestId: harvest.id, sprayId: spray.id, plot: text(harvest.plot_id), safeFrom: safeHarvestDateFor(spray), product: text(spray.product_used) }));
        });
};

/** Waiting periods still running on a plot at the given date (for a new harvest). */
export const activeWaitingPeriods = (logs = [], { plot, date = new Date() } = {}) => {
    const day = parseLocalDate(date) || parseLocalDate(new Date());
    return logs
        .filter((log) => samePlot(log, { plot_id: plot }))
        .map((log) => ({ log, safeFrom: safeHarvestDateFor(log) }))
        .filter(({ log, safeFrom }) => safeFrom && logActivityDate(log) <= day && safeFrom > day)
        .sort((a, b) => b.safeFrom - a.safeFrom);
};

/** Fields the myGAP pesticide record (myGAP 4-5) asks for that this entry lacks. */
export const missingPesticideFields = (log = {}) => {
    if (log.type !== 'pesticide') return [];
    const missing = [];
    if (!logActivityDate(log)) missing.push('activity_date');
    if (!text(log.plot_id)) missing.push('plot_id');
    if (!text(log.crop)) missing.push('crop');
    if (!text(log.product_used)) missing.push('product_used');
    if (!text(log.active_ingredient)) missing.push('active_ingredient');
    if (!text(log.registration_no)) missing.push('registration_no');
    if (!text(log.quantity)) missing.push('quantity');
    if (!text(log.target_pest)) missing.push('target_pest');
    if (parsePhiDays(log.phi_days) === null) missing.push('phi_days');
    return missing;
};

const hasTraceabilityBasics = (log) => Boolean(logActivityDate(log) && text(log.plot_id) && text(log.crop));

const isRecentPestCheck = (entry, now, days) => {
    const date = parseLocalDate(entry.activity_date || entry.created_at || entry.timestamp);
    return Boolean(date) && now - date <= days * DAY_MS;
};

/**
 * Evidence from the records for each checklist item. Only items the records
 * can fully show are auto-completed; others get a hint but stay with the farmer.
 *   { check1: { auto: true, reason: 'pesticideRecordsComplete', count: 3 }, ... }
 */
export const evaluateChecklistEvidence = ({ logs = [], notes = [], scans = [], now = new Date() } = {}) => {
    const today = parseLocalDate(now);
    const evidence = {};

    const pesticideLogs = logs.filter((log) => log.type === 'pesticide');
    const incompleteSprays = pesticideLogs.filter((log) => missingPesticideFields(log).length > 0);
    evidence.check1 = pesticideLogs.length === 0
        ? { auto: false, reason: 'noPesticideRecords' }
        : incompleteSprays.length === 0
            ? { auto: true, reason: 'pesticideRecordsComplete', count: pesticideLogs.length }
            : { auto: false, reason: 'pesticideRecordsIncomplete', count: incompleteSprays.length };

    const pestChecks = [
        ...scans.filter((scan) => isRecentPestCheck(scan, today, 30)),
        ...notes.filter((note) => ['scout', 'inspect'].includes(note.activity_type) && isRecentPestCheck(note, today, 30)),
    ];
    // Monitoring supports integrated pest management but cannot show farm hygiene.
    evidence.check3 = { auto: false, reason: pestChecks.length ? 'pestChecksRecorded' : 'noRecentPestChecks', count: pestChecks.length };

    const untraceable = logs.filter((log) => !hasTraceabilityBasics(log));
    evidence.check8 = logs.length === 0
        ? { auto: false, reason: 'noRecords' }
        : untraceable.length === 0
            ? { auto: true, reason: 'recordsTraceable', count: logs.length }
            : { auto: false, reason: 'recordsMissingPlotOrCrop', count: untraceable.length };

    return evidence;
};

/**
 * Combines the farmer's own answers with record evidence. A manual "not
 * applicable" wins; otherwise an item is complete if the farmer ticked it or
 * the records fully show it.
 */
export const resolveChecklist = (manualState = {}, evidence = {}) => Object.fromEntries(MYGAP_CHECKLIST_IDS.map((id) => {
    const manual = manualState?.[id];
    if (manual === NOT_APPLICABLE) return [id, NOT_APPLICABLE];
    return [id, Boolean(manual === true || evidence[id]?.auto)];
}));

/** Completion percentage over applicable items only. */
export const checklistCompletion = (resolved = {}) => {
    const applicable = MYGAP_CHECKLIST_IDS.filter((id) => resolved[id] !== NOT_APPLICABLE);
    const completed = applicable.filter((id) => resolved[id] === true).length;
    return {
        completed,
        applicable: applicable.length,
        notApplicable: MYGAP_CHECKLIST_IDS.length - applicable.length,
        percent: applicable.length ? Math.round((completed / applicable.length) * 100) : 0,
    };
};
