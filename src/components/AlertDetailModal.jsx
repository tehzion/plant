import { useState } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationProvider.jsx';
import { consumeStorageCleanupNotice, saveLogEntry } from '../utils/localStorage';
import {
    X,
    ShieldCheck,
    CheckCircle2,
    Clock,
    FileText,
    ChevronDown,
    ChevronUp,
    Leaf,
    Sparkles,
} from 'lucide-react';
import { generateSOP } from '../utils/aiFarmService';
import './AlertDetailModal.css';

const SEV = (t) => ({
    critical: { color: '#dc2626', bg: '#fef2f2', label: t('profile.severityCritical') || 'Critical' },
    severe: { color: '#ea580c', bg: '#fff7ed', label: t('profile.severitySevere') || 'Severe' },
    sederhana: { color: '#d97706', bg: '#fffbeb', label: t('profile.severityModerate') || 'Moderate' },
    moderate: { color: '#d97706', bg: '#fffbeb', label: t('profile.severityModerate') || 'Moderate' },
    mild: { color: '#65a30d', bg: '#f7fee7', label: t('profile.severityLow') || 'Low' },
});

const getSev = (severity = '', t) => SEV(t)[severity.toLowerCase()] ?? SEV(t).severe;

const getConfidencePercent = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return Math.round(numeric > 1 ? numeric : numeric * 100);
};

const extractSteps = (scan) => {
    const resultJson = scan.result_json ?? {};
    if (Array.isArray(resultJson.treatment)) return resultJson.treatment;
    if (typeof resultJson.treatment === 'string') {
        return resultJson.treatment
            .split(/\.\s+/)
            .filter(Boolean)
            .map((step) => step.trim() + '.');
    }
    if (Array.isArray(resultJson.treatments)) return resultJson.treatments;
    if (resultJson.additionalCare) return [resultJson.additionalCare];
    return [];
};

const AlertDetailModal = ({ scan, onClose, onAcknowledge }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { notifyError, notifyWarning } = useNotifications();
    const [showSteps, setShowSteps] = useState(true);
    const [resolution, setResolution] = useState('');
    const [status, setStatus] = useState('in_progress');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [generatingSOP, setGeneratingSOP] = useState(false);

    const sevCfg = getSev(scan.severity, t);
    const steps = extractSteps(scan);
    const confidencePercent = getConfidencePercent(scan.confidence);

    const handleGenerateSOP = async () => {
        setGeneratingSOP(true);
        try {
            const lang = localStorage.getItem('appLanguage') || 'en';
            const crop = scan.category || scan.plantType || 'Crop';
            const result = await generateSOP(crop, scan.disease, scan.severity || 'Moderate', lang);

            let sopText = `${t('profile.aiSopTitle') || 'Suggested SOP:'}\n`;
            result.treatmentPlan?.forEach((step, index) => {
                sopText += `${index + 1}. ${step}\n`;
            });
            if (result.recommendedChemicals?.length > 0) {
                sopText += `\n${t('profile.aiRecommended') || 'Recommended products:'} ${result.recommendedChemicals.join(', ')}`;
            }

            setResolution((prev) => (prev ? `${prev}\n\n${sopText}` : sopText));
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
            id: Date.now().toString(36),
            type: `Treatment: ${scan.disease}`,
            notes: `Status: ${status === 'resolved' ? 'Resolved' : 'In Progress'}. ${resolution}`.trim(),
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
        setTimeout(() => {
            onAcknowledge(scan.id);
            onClose();
        }, 800);
    };

    const handleAcknowledgeOnly = () => {
        onAcknowledge(scan.id);
        onClose();
    };

    return (
        <div className="adm-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
            <div
                className="adm-modal"
                style={{
                    '--adm-accent': sevCfg.color,
                    '--adm-soft': sevCfg.bg,
                    '--adm-border': `${sevCfg.color}40`,
                }}
            >
                <div className="adm-header">
                    <div className="adm-header-left">
                        <div className="adm-disease-icon">
                            <Leaf size={20} />
                        </div>
                        <div>
                            <h2 className="adm-title">{scan.disease}</h2>
                            <div className="adm-meta">
                                <span className="adm-sev-badge">{sevCfg.label}</span>
                                {scan.category && <span className="adm-cat">{scan.category}</span>}
                            </div>
                        </div>
                    </div>
                    <button type="button" className="adm-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="adm-body">
                    <div className="adm-info-row">
                        <Clock size={13} />
                        <span>{t('profile.detected') || 'Detected'}: {new Date(scan.timestamp ?? scan.created_at).toLocaleDateString()}</span>
                        {confidencePercent && (
                            <>
                                <ShieldCheck size={13} />
                                <span>{confidencePercent}%</span>
                            </>
                        )}
                    </div>

                    {steps.length > 0 && (
                        <div className="adm-section">
                            <button type="button" className="adm-section-toggle" onClick={() => setShowSteps((value) => !value)}>
                                <FileText size={15} />
                                <span>{t('results.treatmentSteps') || 'Response Steps (SOP)'}</span>
                                {showSteps ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {showSteps && (
                                <ol className="adm-steps">
                                    {steps.map((step, index) => (
                                        <li key={index} className="adm-step">
                                            <span className="adm-step-num">{index + 1}</span>
                                            <span>{step}</span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    )}

                    {!submitted ? (
                        <div className="adm-section">
                            <div className="adm-section-header adm-section-header--split">
                                <div className="adm-section-label">
                                    <CheckCircle2 size={15} />
                                    <span>{t('profile.logTreatment') || 'Log Treatment Action'}</span>
                                </div>
                                <button
                                    type="button"
                                    className="adm-sop-btn"
                                    onClick={handleGenerateSOP}
                                    disabled={generatingSOP || submitting}
                                >
                                    {generatingSOP ? (
                                        t('profile.aiGenerating') || 'Preparing...'
                                    ) : (
                                        <>
                                            <Sparkles size={12} />
                                            {t('profile.aiSopHeader') || 'Suggested SOP'}
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="adm-status-row">
                                <button
                                    type="button"
                                    className={`adm-status-btn ${status === 'in_progress' ? 'active-amber' : ''}`}
                                    onClick={() => setStatus('in_progress')}
                                >
                                    <Clock size={14} /> {t('profile.inProgress') || 'In Progress'}
                                </button>
                                <button
                                    type="button"
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
                                onChange={(event) => setResolution(event.target.value)}
                                rows={3}
                            />

                            <div className="adm-footer-btns">
                                <button type="button" className="adm-ack-btn" onClick={handleAcknowledgeOnly}>
                                    {t('profile.acknowledgeOnly') || 'Acknowledge Only'}
                                </button>
                                <button
                                    type="button"
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
                            <CheckCircle2 size={24} className="adm-success-icon" />
                            <span>{t('profile.loggedSuccess') || 'Logged to Activity Log'}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AlertDetailModal;
