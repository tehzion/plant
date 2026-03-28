import { useState } from 'react';
import { generateInsights, parseNaturalLog } from '../utils/aiFarmService';

const GENERIC_NAME_BLOCKLIST = [
    'chemical', 'kimia', 'organic', 'organik',
    'fertilizer', 'baja', 'pesticide', 'racun',
    'fungicide', 'herbicide', 'insecticide',
    'product', 'produk', 'unknown', 'tidak diketahui',
    'n/a', 'none', 'null', '-',
];

const isGenericName = (name) => {
    if (!name) return true;
    return GENERIC_NAME_BLOCKLIST.some(
        (blocked) => name.trim().toLowerCase() === blocked,
    );
};

const normalizeGenericNames = (parsed) => ({
    ...parsed,
    chemicalName: isGenericName(parsed.chemicalName) ? '' : parsed.chemicalName,
});

const normalizeActivityType = (value, fallback) => {
    const typeMap = {
        spray: 'spray',
        racun: 'spray',
        pesticide: 'spray',
        fertilize: 'fertilize',
        baja: 'fertilize',
        harvest: 'harvest',
        tuai: 'harvest',
        prune: 'prune',
        pangkas: 'prune',
        inspect: 'inspect',
        scout: 'scout',
        note: 'note',
    };
    return typeMap[(value || '').toLowerCase()] || fallback;
};

const normalizeScoutSeverity = (value, fallback) => {
    const severity = (value || '').toLowerCase();
    if (severity === 'high') return 'High';
    if (severity === 'moderate') return 'Moderate';
    if (severity === 'low') return 'Low';
    return fallback;
};

const DEFAULT_WELCOME_RECOMMENDATIONS = [
    'Add a new farm plot and record soil pH and NPK data.',
    'Use the daily log to record fertilizing, spraying, and harvesting.',
    'Perform weekly scans to detect issues early.',
];

const isWithinLastDays = (value, days) => {
    if (!value) return false;
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return false;
    return timestamp >= Date.now() - (days * 86400000);
};

const filterRecentEntries = (entries = [], days) =>
    entries.filter((entry) => isWithinLastDays(entry?.created_at || entry?.timestamp, days));

export const useAIAdvisor = ({
    t,
    notes,
    plots,
    checklistPct,
    noteForm,
    setNoteForm,
    notifyError,
    notifySuccess,
}) => {
    const [aiInsights, setAiInsights] = useState(null);
    const [generatingInsights, setGeneratingInsights] = useState(false);
    const [generatingInsightsScopeKey, setGeneratingInsightsScopeKey] = useState(null);
    const [enhancing, setEnhancing] = useState(false);
    const [enhanceText, setEnhanceText] = useState('');

    const handleGenerateInsights = async ({
        activeAlerts = [],
        harvestLogs = [],
        notesOverride,
        plotsOverride,
        scopeKey = 'overview',
    } = {}) => {
        if (generatingInsights) return;
        setGeneratingInsights(true);
        setGeneratingInsightsScopeKey(scopeKey);

        try {
            const language = localStorage.getItem('appLanguage') || 'en';
            const effectiveNotes = Array.isArray(notesOverride) ? notesOverride : notes;
            const effectivePlots = Array.isArray(plotsOverride) ? plotsOverride : plots;
            const recentLogs = filterRecentEntries(effectiveNotes, 7);
            const recentHarvests = filterRecentEntries(harvestLogs, 30);

            if (
                recentLogs.length === 0 &&
                activeAlerts.length === 0 &&
                recentHarvests.length === 0 &&
                effectivePlots.length === 0
            ) {
                const welcomeRecommendations = t?.('profile.aiWelcomeRecommendations');
                setAiInsights({
                    scopeKey,
                    summary: t?.('profile.aiWelcomeSummary')
                        || 'Welcome to your AI Agronomist. Add a plot or activity log to start receiving tailored recommendations.',
                    yieldAnalysis: null,
                    recommendations: Array.isArray(welcomeRecommendations)
                        ? welcomeRecommendations
                        : DEFAULT_WELCOME_RECOMMENDATIONS,
                });
                return;
            }

            const data = await generateInsights(
                recentLogs,
                activeAlerts,
                recentHarvests,
                effectivePlots,
                checklistPct,
                language,
            );
            setAiInsights({
                ...data,
                scopeKey,
            });
        } catch (error) {
            console.error('Failed to generate insights:', error);
            notifyError?.(
                t?.('error.aiGenerationFailed')
                || 'Failed to generate AI insights. Please check your connection.',
            );
        } finally {
            setGeneratingInsights(false);
            setGeneratingInsightsScopeKey(null);
        }
    };

    const handleAutoEnhance = async (textToUse = '') => {
        const text = textToUse || enhanceText || noteForm.note;
        if (!text || text.trim().length < 3) return;

        setEnhancing(true);

        try {
            const language = localStorage.getItem('appLanguage') || 'en';
            const raw = await parseNaturalLog(text, language);

            if (!raw || Object.keys(raw).length === 0) {
                throw new Error('AI returned empty or invalid data');
            }

            const parsed = normalizeGenericNames(raw);

            let plotId = null;
            if (parsed.plotId) {
                const matched = plots.find(
                    (plot) =>
                        plot.name.toLowerCase().includes(parsed.plotId.toLowerCase()) ||
                        parsed.plotId.toLowerCase().includes(plot.name.toLowerCase()),
                );
                plotId = matched?.id ?? null;
            }

            setNoteForm((form) => ({
                ...form,
                activity_type: normalizeActivityType(parsed.type, form.activity_type),
                plot_id: plotId || form.plot_id,
                chemical_name: parsed.chemicalName || form.chemical_name,
                chemical_qty: parsed.quantity || form.chemical_qty,
                kg_harvested: parsed.kg_harvested || form.kg_harvested,
                price_per_kg: parsed.price_per_kg || form.price_per_kg,
                quality_grade: parsed.quality_grade || form.quality_grade,
                buyer_name: parsed.buyer_name || form.buyer_name,
                pruned_count: parsed.pruned_count || form.pruned_count,
                pruning_type: parsed.pruning_type || form.pruning_type,
                inspection_type: parsed.inspection_type || form.inspection_type,
                inspection_status: parsed.inspection_status || form.inspection_status,
                temperature_am: parsed.temperature || form.temperature_am,
                humidity: parsed.humidity || form.humidity,
                disease_name_observed: parsed.disease_name || form.disease_name_observed,
                scout_severity: normalizeScoutSeverity(parsed.severity, form.scout_severity),
                expense_amount: parsed.expense_amount || form.expense_amount,
                expense_category: parsed.expense_category || form.expense_category,
                note: parsed.notes || text,
            }));

            setEnhanceText('');
            notifySuccess?.(
                t?.('form.enhanceSuccess') || 'Log enhanced — please review the fields below.',
            );
        } catch (error) {
            console.error('Auto-Enhance failed:', error);
            notifyError?.(
                t?.('error.aiEnhanceFailed')
                || 'AI enhancement failed. Please check your backend connection.',
            );
        } finally {
            setEnhancing(false);
        }
    };

    return {
        aiInsights,
        generatingInsights,
        generatingInsightsScopeKey,
        enhancing,
        enhanceText,
        setEnhanceText,
        handleGenerateInsights,
        handleAutoEnhance,
    };
};
