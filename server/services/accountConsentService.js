import { queryNeon } from '../utils/neonDatabase.js';
import { normalizeDataConsent } from '../../shared/dataConsent.js';

export const getAccountConsent = async (userId) => {
    const { rows } = await queryNeon('select data_consent from public.profiles where user_id = $1', [userId]);
    return normalizeDataConsent(rows[0]?.data_consent);
};

export const saveAccountConsent = async (userId, input) => {
    const consent = { ...normalizeDataConsent(input), decidedAt: new Date().toISOString() };
    await queryNeon(`insert into public.profiles (user_id, data_consent, updated_at) values ($1, $2, now())
        on conflict (user_id) do update set data_consent = excluded.data_consent, updated_at = now()`, [userId, consent]);
    return consent;
};

// An old device cannot opt an account back in after withdrawal on another device.
// Before the additive migration is installed, signed-in scans remain opted out.
export const resolveAccountScanConsent = async (userId, submitted) => {
    if (!normalizeDataConsent(submitted).aiImprovement) return normalizeDataConsent(null);
    try {
        return await getAccountConsent(userId);
    } catch {
        return normalizeDataConsent(null);
    }
};
