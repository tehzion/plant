// Public contact and version shared by privacy controls and telemetry admission.
export const PRIVACY_EMAIL = 'privacy@infinitas.com.my';
export const PRIVACY_NOTICE_VERSION = '2026-11-02';
export const ANALYTICS_CONSENT_VERSION = '2026-11-v1';
export const hasAnalyticsConsent = value => value?.enabled === true && value?.version === ANALYTICS_CONSENT_VERSION;
