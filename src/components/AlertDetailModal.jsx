import { useState } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationProvider.jsx';
import { consumeStorageCleanupNotice, saveLogEntry } from '../utils/localStorage';
import {
    X, AlertTriangle, ShieldCheck, CheckCircle2,
    Clock, FileText, ChevronDown, ChevronUp, Leaf, Sparkles
} from 'lucide-react';
import { generateSOP } from '../utils/aiFarmService';

// ── Severity config ───────────────────────────────────────────────────────────
const SEV = (t) => ({
    critical: { color: '#dc2626', bg: '#fef2f2', label: t('profile.severityCritical') || 'Critical' },
    severe:   { color: '#ea580c', bg: '#fff7ed', label: t('profile.severitySevere')   || 'Severe'   },
    sederhana:{ color: '#d97706', bg: '#fffbeb', label: t('profile.severityModerate') || 'Moderate' },
    moderate: { color: '#d97706', bg: '#fffbeb', label: t('profile.severityModerate') || 'Moderate' },
    mild:     { color: '#65a30d', bg: '#f7fee7', label: t('profile.severityLow')      || 'Low'      },
});
const getSev = (s = '', t) => SEV(t)[s.toLowerCase()] ?? SEV(t).severe;

const getConfidencePercent = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return Math.round(numeric > 1 ? numeric : numeric * 100);
};

// ── Extract treatment steps from scan result ──────────────────────────────────
const extractSteps = (scan) => {
    // result_json may contain treatment as string or array
    const rj = scan.result_json ?? {};
    if (Array.isArray(rj.treatment))        return rj.treatment;
    if (typeof rj.treatment === 'string')   return rj.treatment.split(/\.\s+/).filter(Boolean).map(s => s.trim() + '.');
    if (Array.isArray(rj.treatments))       return rj.treatments;
    if (rj.additionalCare)                  return [rj.additionalCare];
    return [];
};

// ── Modal ─────────────────────────────────────────────────────────────────────
const AlertDetailModal = ({ scan, onClose, onAcknowledge }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { notifyError, notifyWarning } = useNotifications();
    const [showSteps, setShowSteps]         = useState(true);
    const [resolution, setResolution]       = useState('');
    const [status, setStatus]               = useState('in_progress'); // in_progress | resolved
    const [submitting, setSubmitting]       = useState(false);
    const [submitted, setSubmitted]         = useState(false);
    const [generatingSOP, setGeneratingSOP] = useState(false);

    const sevCfg = getSev(scan.severity, t);
    const steps  = extractSteps(scan);
    const confidencePercent = getConfidencePercent(scan.confidence);

    const handleGenerateSOP = async () => {
        setGeneratingSOP(true);
        try {
            const lang = localStorage.getItem('appLanguage') || 'en';
            const crop = scan.category || scan.plantType || 'Crop';
            const result = await generateSOP(crop, scan.disease, scan.severity || 'Moderate', lang);
            
            let sopText = `${t('profile.aiSopTitle') || "Suggested SOP:"}\n`;
            result.treatmentPlan?.forEach((step, i) => {
                sopText += `${i + 1}. ${step}\n`;
            });
            if (result.recommendedChemicals?.length > 0) {
                sopText += `\n${t('profile.aiRecommended') || "Recommended products:"} ${result.recommendedChemicals.join(', ')}`;
            }
            
            setResolution(prev => prev ? `${prev}\n\n${sopText}` : sopText);
        } catch (error) {
            console.error('Failed to generate SOP:', error);
            const sopFailureText = t('profile.aiSopFailed');
            notifyError(
                sopFailureText === 'profile.aiSopFailed'
                    ? (t('home.errorGeneral') || 'Failed to generate SOP. Please check connection.')
                    : sopFailureText,
            );
        } finally {
            setGeneratingSOP(false);
        }
    };

    const handleLog = async () => {
        setSubmitting(true);
        const logEntry = {
            id:        Date.now().toString(36),
            type:      `Treatment: ${scan.disease}`,
            notes:     `Status: ${status === 'resolved' ? 'Resolved' : 'In Progress'}. ${resolution}`.trim(),
            timestamp: new Date().toISOString(),
            linkedScanId: scan.id,
            treatmentStatus: status,
        };
        await Promise.resolve(saveLogEntry(logEntry, user?.id ?? null));
        const cleanupNotice = consumeStorageCleanupNotice();
        if (cleanupNotice) {
            notifyWarning(
                t('common.storageCleanupNotice')
                || 'Old records were cleaned up to save your latest data.',
            );
        }
        setSubmitted(true);
        setSubmitting(false);
        // Notify parent so the alert gets acknowledged after logging
        setTimeout(() => { onAcknowledge(scan.id); onClose(); }, 800);
    };

    const handleAcknowledgeOnly = () => {
        onAcknowledge(scan.id);
        onClose();
    };

    return (
        <div className="adm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="adm-modal">

                {/* Header */}
                <div className="adm-header" style={{ borderColor: sevCfg.color + '40' }}>
                    <div className="adm-header-left">
                        <div className="adm-disease-icon" style={{ background: sevCfg.bg, color: sevCfg.color }}>
                            <Leaf size={20} />
                        </div>
                        <div>
                            <h2 className="adm-title">{scan.disease}</h2>
                            <div className="adm-meta">
                                <span className="adm-sev-badge" style={{ background: sevCfg.bg, color: sevCfg.color }}>
                                    {sevCfg.label}
                                </span>
                                {scan.category && <span className="adm-cat">{scan.category}</span>}
                            </div>
                        </div>
                    </div>
                    <button className="adm-close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="adm-body">

                    {/* Scan info */}
                    <div className="adm-info-row">
                        <Clock size={13} />
                        <span>{t('profile.detected') || 'Detected'}: {new Date(scan.timestamp ?? scan.created_at).toLocaleDateString()}</span>
                        {confidencePercent && (
                            <><ShieldCheck size={13} /><span>{confidencePercent}%</span></>
                        )}
                    </div>

                    {/* Treatment Steps */}
                    {steps.length > 0 && (
                        <div className="adm-section">
                            <button className="adm-section-toggle" onClick={() => setShowSteps(v => !v)}>
                                <FileText size={15} />
                                <span>{t('results.treatmentSteps') || 'Response Steps (SOP)'}</span>
                                {showSteps ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {showSteps && (
                                <ol className="adm-steps">
                                    {steps.map((step, i) => (
                                        <li key={i} className="adm-step">
                                            <span className="adm-step-num">{i + 1}</span>
                                            <span>{step}</span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    )}

                    {/* Treatment log form */}
                    {!submitted ? (
                        <div className="adm-section">
                            <div className="adm-section-header" style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircle2 size={15} />
                                    <span>{t('profile.logTreatment') || 'Log Treatment Action'}</span>
                                </div>
                                <button 
                                    onClick={handleGenerateSOP} 
                                    disabled={generatingSOP || submitting}
                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f5f3ff', color: '#8b5cf6', border: '1px solid #ddd6fe', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s' }}
                                >
                                    {generatingSOP ? (t('profile.aiGenerating') || 'Preparing...') : <><Sparkles size={12} /> {t('profile.aiSopHeader') || 'Suggested SOP'}</>}
                                </button>
                            </div>

                            {/* Status toggle */}
                            <div className="adm-status-row">
                                <button
                                    className={`adm-status-btn ${status === 'in_progress' ? 'active-amber' : ''}`}
                                    onClick={() => setStatus('in_progress')}
                                >
                                    <Clock size={14} /> {t('profile.inProgress') || 'In Progress'}
                                </button>
                                <button
                                    className={`adm-status-btn ${status === 'resolved' ? 'active-green' : ''}`}
                                    onClick={() => setStatus('resolved')}
                                >
                                    <CheckCircle2 size={14} /> {t('profile.resolved') || 'Resolved'}
                                </button>
                            </div>

                            <textarea
                                className="adm-textarea"
                                placeholder={t('profile.resolutionPlaceholder') || 'Describe what was done (pesticide used, quantity, date applied)...'}
                                value={resolution}
                                onChange={e => setResolution(e.target.value)}
                                rows={3}
                            />

                            <div className="adm-footer-btns">
                                <button className="adm-ack-btn" onClick={handleAcknowledgeOnly}>
                                    {t('profile.acknowledgeOnly') || 'Acknowledge Only'}
                                </button>
                                <button
                                    className="adm-log-btn"
                                    onClick={handleLog}
                                    disabled={submitting}
                                >
                                    {submitting ? '...' : (t('profile.saveToLog') || 'Save to Activity Log')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="adm-success">
                            <CheckCircle2 size={24} color="#16a34a" />
                            <span>{t('profile.loggedSuccess') || 'Logged to Activity Log'}</span>
                        </div>
                    )}

                </div>
            </div>

            <style>{`
                .adm-overlay {
                    position: fixed; inset: 0;
                    background: rgba(0,0,0,0.5);
                    z-index: 999;
                    display: flex; align-items: flex-end; justify-content: center;
                    animation: fadeIn 0.15s ease;
                }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

                .adm-modal {
                    background: white;
                    border-radius: 24px 24px 0 0;
                    width: 100%;
                    max-width: 520px;
                    max-height: 90vh;
                    overflow-y: auto;
                    animation: slideUp 0.2s ease;
                }
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

                .adm-header {
                    display: flex; align-items: flex-start; justify-content: space-between;
                    padding: 20px 20px 16px;
                    border-bottom: 1.5px solid;
                    gap: 12px;
                }
                .adm-header-left { display: flex; gap: 12px; align-items: flex-start; flex: 1; }
                .adm-disease-icon {
                    width: 44px; height: 44px; border-radius: 12px;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                }
                .adm-title { font-size: 1.05rem; font-weight: 800; color: #1f2937; margin: 0 0 6px; }
                .adm-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
                .adm-sev-badge {
                    padding: 2px 9px; border-radius: 999px;
                    font-size: 0.7rem; font-weight: 800; text-transform: uppercase;
                }
                .adm-cat { font-size: 0.78rem; color: #6b7280; }
                .adm-close-btn {
                    background: #f3f4f6; border: none; border-radius: 8px;
                    padding: 6px; cursor: pointer; color: #6b7280; flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                }
                .adm-close-btn:hover { background: #e5e7eb; }

                .adm-body { padding: 16px 20px 24px; display: flex; flex-direction: column; gap: 14px; }

                .adm-info-row {
                    display: flex; align-items: center; gap: 6px;
                    font-size: 0.78rem; color: #6b7280; flex-wrap: wrap;
                }
                .adm-info-row svg { color: #9ca3af; }

                .adm-section {
                    background: #f9fafb; border: 1px solid #e5e7eb;
                    border-radius: 12px; overflow: hidden;
                }
                .adm-section-toggle {
                    display: flex; align-items: center; gap: 8px;
                    width: 100%; padding: 12px 14px;
                    background: none; border: none; cursor: pointer;
                    font-size: 0.85rem; font-weight: 700; color: #374151;
                    text-align: left;
                }
                .adm-section-toggle svg { color: var(--color-primary); }
                .adm-section-toggle span { flex: 1; }
                .adm-section-header {
                    display: flex; align-items: center; gap: 8px;
                    padding: 12px 14px; border-bottom: 1px solid #e5e7eb;
                    font-size: 0.85rem; font-weight: 700; color: #374151;
                }
                .adm-section-header svg { color: var(--color-primary); }

                .adm-steps {
                    margin: 0; padding: 12px 14px; list-style: none;
                    display: flex; flex-direction: column; gap: 8px;
                }
                .adm-step { display: flex; gap: 10px; align-items: flex-start; }
                .adm-step-num {
                    width: 20px; height: 20px; border-radius: 50%;
                    background: var(--gradient-primary); color: white;
                    font-size: 0.68rem; font-weight: 800;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0; margin-top: 1px;
                }
                .adm-step span:last-child { font-size: 0.83rem; color: #374151; line-height: 1.4; }

                .adm-status-row { display: flex; gap: 8px; padding: 12px 14px; }
                .adm-status-btn {
                    flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
                    padding: 9px; border: 1.5px solid #e5e7eb; border-radius: 10px;
                    background: white; font-size: 0.8rem; font-weight: 700; color: #6b7280;
                    cursor: pointer; transition: all 0.15s;
                }
                .adm-status-btn.active-amber { border-color: #f59e0b; background: #fffbeb; color: #d97706; }
                .adm-status-btn.active-green { border-color: #22c55e; background: #f0fdf4; color: #16a34a; }

                .adm-textarea {
                    width: 100%; box-sizing: border-box;
                    margin: 0 0 12px 0; padding: 10px 14px;
                    border: none; border-top: 1px solid #e5e7eb;
                    background: #f9fafb;
                    font-size: 0.85rem; color: #1f2937; resize: vertical;
                    font-family: inherit; outline: none;
                    min-height: 72px;
                }
                .adm-textarea:focus { background: white; }

                .adm-footer-btns {
                    display: flex; gap: 8px; padding: 0 14px 14px;
                }
                .adm-ack-btn {
                    flex: 1; padding: 11px;
                    background: none; border: 1.5px solid #e5e7eb;
                    border-radius: 10px; font-size: 0.82rem; font-weight: 700;
                    color: #6b7280; cursor: pointer; transition: all 0.15s;
                }
                .adm-ack-btn:hover { border-color: #d1d5db; background: #f9fafb; }
                .adm-log-btn {
                    flex: 2; padding: 11px;
                    background: var(--gradient-primary); border: none;
                    border-radius: 10px; font-size: 0.82rem; font-weight: 700;
                    color: white; cursor: pointer; transition: background 0.15s;
                }
                .adm-log-btn:hover:not(:disabled) { background: var(--color-primary-dark); }
                .adm-log-btn:disabled { opacity: 0.6; cursor: not-allowed; }

                .adm-success {
                    display: flex; align-items: center; gap: 10px;
                    padding: 14px; background: #f0fdf4;
                    border: 1px solid #bbf7d0; border-radius: 12px;
                    font-size: 0.88rem; font-weight: 700; color: #16a34a;
                }
            `}</style>
        </div>
    );
};

export default AlertDetailModal;

