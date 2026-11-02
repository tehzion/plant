import { exportOwnerDeviceData, clearOwnerDeviceData, isIndexedDbAvailable } from './indexedDbStorage.js';
import { fetchNeonRows } from './neonApi.js';
import { getGuestId } from './localStorage.js';
import { PRIVACY_EMAIL, PRIVACY_NOTICE_VERSION } from '../../shared/privacy.js';

const LIMIT_BYTES = 20 * 1024 * 1024;
const DATASETS = ['profiles', 'scan_history', 'mygap_logs', 'mygap_checklist', 'daily_notes', 'plots'];
const AUXILIARY_KEYS = ['agropreneur.dataConsent', 'kanb.analytics', 'kanb_assistant_chat_v2', 'plant_scan_field_answers', 'plant_mygap_log_defaults', 'plant_harvest_reminders', 'plant_reminders_opt_in', 'plant_capture_preferences', 'plant_reminders_notified_on'];
const LEGACY_GUEST_KEYS = ['sea_plant_scan_history', 'sea_plant_mygap_logbook', 'sea_plant_mygap_checklist', 'sea_plant_daily_notes', 'sea_plant_plots', 'sea_plant_orders', 'sea_plant_profile', 'sea_plant_farm_profile'];

export const privacyRequestLink = (type, language = 'en') => {
    const body = language === 'ms'
        ? `Kepada pasukan privasi,\n\nSaya ingin membuat permintaan: ${type}.\nE-mel akaun / rujukan imbasan atau pesanan saya:\nButiran dan skop permintaan:\n\nSila maklumkan cara pengesahan identiti yang selamat. Saya tidak menyertakan kata laluan, token atau salinan MyKad.`
        : `Dear privacy team,\n\nMy request: ${type}.\nMy account email / scan or order reference:\nDetails and scope of request:\n\nPlease explain any secure identity verification needed. I have not included passwords, tokens or an identity-card copy.`;
    return `mailto:${PRIVACY_EMAIL}?subject=${encodeURIComponent(`PDPA — ${type}`)}&body=${encodeURIComponent(body)}`;
};

export const purgeUnownedPrivacyStores = () => {
    for (const key of ['agropreneur.dataConsent', 'kanb_assistant_chat_v1', 'plant_scan_field_answers', 'plant_mygap_log_defaults', 'plant_harvest_reminders', 'plant_reminders_opt_in', 'plant_capture_preferences']) {
        try { localStorage.removeItem(key); } catch { /* unavailable storage */ }
    }
    try {
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith('kanb.weather.v1:')) localStorage.removeItem(key);
            if (key.startsWith('kanb.weather.v2:')) {
                try { if (Date.now() - Number(JSON.parse(localStorage.getItem(key)).timestamp || 0) > 6 * 3600000) localStorage.removeItem(key); }
                catch { localStorage.removeItem(key); }
            }
        }
    } catch { /* unavailable storage */ }
};

const devicePreferences = owner => Object.fromEntries(AUXILIARY_KEYS.flatMap(key => {
    const value = localStorage.getItem(`${key}:${owner}`);
    return value === null ? [] : [[key, value]];
}));

const packBlobs = async value => {
    if (value instanceof Blob) {
        if (value.size > LIMIT_BYTES) throw new Error('Export is too large. Contact the privacy team for assistance.');
        const bytes = new Uint8Array(await value.arrayBuffer());
        let binary = '';
        for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        return { type: value.type, size: value.size, base64: btoa(binary) };
    }
    if (Array.isArray(value)) return Promise.all(value.map(packBlobs));
    if (value && typeof value === 'object') return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await packBlobs(item)])));
    return value;
};

export const buildPrivacyExport = async ({ owner, userId = null, assertOwner = () => {} }) => {
    if (!owner) throw new Error('Wait for your session to load.');
    const output = {
        generatedAt: new Date().toISOString(), noticeVersion: PRIVACY_NOTICE_VERSION,
        scope: 'Application records and this actor’s device copies; not a complete statutory access response or direct-controller portability transfer.',
        excluded: ['Authentication-provider records', 'Commerce-provider orders', 'Audit/review/feedback/analytics records', 'Provider logs/backups and previously exported datasets'],
        fullAccessContact: PRIVACY_EMAIL,
        preferences: { ...devicePreferences(owner), weather: Object.fromEntries(Object.keys(localStorage).filter(key => key.startsWith(`kanb.weather.v2:${owner}:`)).map(key => [key, localStorage.getItem(key)])), ...(userId ? { profile: localStorage.getItem(`profile_info_${userId}`) } : {}) },
        cloud: {},
        device: isIndexedDbAvailable() ? await exportOwnerDeviceData(owner) : { unavailable: true },
    };
    const oversized = () => { if (new Blob([JSON.stringify(output)]).size > LIMIT_BYTES) throw new Error('Export exceeds the device limit. Request a full export from the privacy team.'); };
    if (owner === `guest:${getGuestId()}`) output.legacyDeviceRecords = Object.fromEntries(LEGACY_GUEST_KEYS.map(key => [key, localStorage.getItem(key)]).filter(([, value]) => value !== null));
    if (userId) {
        for (const table of DATASETS) {
            const rows = [];
            for (let offset = 0; ; offset += 500) {
                assertOwner();
                const page = await fetchNeonRows(table, { limit: 500, offset });
                assertOwner();
                rows.push(...page);
                if (rows.length > 10000) throw new Error('More records than this device can export. Contact the privacy team.');
                if (page.length < 500) break;
            }
            output.cloud[table] = rows;
            oversized();
        }
    }
    assertOwner();
    let blobBytes = 0;
    const countBlobs = value => {
        if (value instanceof Blob) blobBytes += value.size;
        else if (Array.isArray(value)) value.forEach(countBlobs);
        else if (value && typeof value === 'object') Object.values(value).forEach(countBlobs);
    };
    countBlobs(output);
    if (blobBytes * 4 / 3 + new Blob([JSON.stringify(output)]).size > LIMIT_BYTES) throw new Error('Export exceeds the device limit. Contact the privacy team.');
    const packed = await packBlobs(output);
    if (new Blob([JSON.stringify(packed)]).size > LIMIT_BYTES) throw new Error('Export exceeds the device limit. Contact the privacy team.');
    assertOwner();
    return packed;
};

export const clearPrivacyDeviceData = async owner => {
    if (!owner) throw new Error('Wait for your session to load.');
    if (isIndexedDbAvailable()) await clearOwnerDeviceData(owner);
    for (const key of AUXILIARY_KEYS) localStorage.removeItem(`${key}:${owner}`);
    for (const key of Object.keys(localStorage)) if (key.startsWith(`kanb.weather.v2:${owner}:`)) localStorage.removeItem(key);
    if (owner.startsWith('user:')) localStorage.removeItem(`profile_info_${owner.slice(5)}`);
    if (owner === `guest:${getGuestId()}`) {
        for (const key of LEGACY_GUEST_KEYS) localStorage.removeItem(key);
        try {
            const oldCapture = JSON.parse(localStorage.getItem('plant_capture_preferences') || 'null');
            if (oldCapture?.owner === owner) localStorage.removeItem('plant_capture_preferences');
        } catch { /* malformed obsolete preference */ }
    }
};
