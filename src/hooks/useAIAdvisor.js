import { useState } from 'react';
import { generateInsights, parseNaturalLog } from '../utils/aiFarmService';

// ─── Generic name blocklist ───────────────────────────────────────────────────
// These are vague placeholders the AI sometimes returns.
// We strip them so the UI only shows real product names.
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

/**
 * Strip generic chemical/fertilizer names from the parsed AI result.
 * Returns the cleaned object so only specific product names reach the form.
 */
const normalizeGenericNames = (parsed) => ({
    ...parsed,
    chemicalName: isGenericName(parsed.chemicalName) ? '' : parsed.chemicalName,
});

// ─── Activity type mapping ────────────────────────────────────────────────────
const normalizeActivityType = (value, fallback) => {
    const typeMap = {
        spray:     'spray',
        racun:     'spray',
        pesticide: 'spray',
        fertilize: 'fertilize',
        baja:      'fertilize',
        harvest:   'harvest',
        tuai:      'harvest',
        prune:     'prune',
        pangkas:   'prune',
        inspect:   'inspect',
        scout:     'scout',
        note:      'note',
    };
    return typeMap[(value || '').toLowerCase()] || fallback;
};

const normalizeScoutSeverity = (value, fallback) => {
    const s = (value || '').toLowerCase();
    if (s === 'high')     return 'High';
    if (s === 'moderate') return 'Moderate';
    if (s === 'low')      return 'Low';
    return fallback;
};

// ═════════════════════════════════════════════════════════════════════════════

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
    const [aiInsights, setAiInsights]             = useState(null);
    const [generatingInsights, setGeneratingInsights] = useState(false);
    const [enhancing, setEnhancing]               = useState(false);
    const [enhanceText, setEnhanceText]            = useState('');

    // ── AI Summary (Agronomist Report) ────────────────────────────────────────
    const handleGenerateInsights = async (activeAlerts, harvestLogs) => {
        if (generatingInsights) return;
        setGeneratingInsights(true);

        try {
            const language   = localStorage.getItem('appLanguage') || 'en';
            // Pass up to 15 recent activity logs so the AI has context
            const recentLogs = notes.slice(0, 15);

            if (
                recentLogs.length === 0 &&
                activeAlerts.length === 0 &&
                harvestLogs.length === 0 &&
                plots.length === 0
            ) {
                setAiInsights({
                    summary: language === 'zh'
                        ? '欢迎使用 AI 农艺师。添加地块或日志后即可获得更具体的建议。'
                        : language === 'ms'
                            ? 'Selamat datang ke AI Agronomia. Tambah petak atau log untuk menerima cadangan yang lebih khusus.'
                            : 'Welcome to your AI Agronomist. Add a plot or activity log to start receiving tailored recommendations.',
                    yieldAnalysis: null,
                    recommendations: [
                        language === 'zh'
                            ? '添加新地块并记录土壤 pH 与 NPK 数据。'
                            : language === 'ms'
                                ? 'Tambah petak baru dan rekod data pH serta NPK tanah.'
                                : 'Add a new farm plot and record soil pH and NPK data.',
                        language === 'zh'
                            ? '在日志中记录施肥、喷药和采收活动。'
                            : language === 'ms'
                                ? 'Gunakan log untuk merekod pembajaan, semburan, dan tuaian.'
                                : 'Use the daily log to record fertilizing, spraying, and harvesting.',
                        language === 'zh'
                            ? '每周进行一次扫描以尽早发现问题。'
                            : language === 'ms'
                                ? 'Buat imbasan mingguan untuk mengesan isu lebih awal.'
                                : 'Perform weekly scans to detect issues early.',
                    ],
                });
                return;
            }

            // ── Contextual awareness: include recent treatments in the request ──
            // generateInsights already accepts logs as its first param; we pass
            // the full recent activity notes (not just the scan-history logbook).
            const data = await generateInsights(
                recentLogs,
                activeAlerts,
                harvestLogs,
                plots,
                checklistPct,
                language,
            );
            setAiInsights(data);
        } catch (error) {
            console.error('Failed to generate insights:', error);
            notifyError?.(
                t?.('error.aiGenerationFailed') ||
                'Failed to generate AI insights. Please check your connection.',
            );
        } finally {
            setGeneratingInsights(false);
        }
    };

    // ── AI Auto-Enhance ───────────────────────────────────────────────────────
    const handleAutoEnhance = async (textToUse = '') => {
        const text = textToUse || enhanceText || noteForm.note;
        if (!text || text.trim().length < 3) return;

        setEnhancing(true);

        try {
            const language = localStorage.getItem('appLanguage') || 'en';
            const raw      = await parseNaturalLog(text, language);

            if (!raw || Object.keys(raw).length === 0) {
                throw new Error('AI returned empty or invalid data');
            }

            // Validate & clean generic names before populating the form
            const parsed = normalizeGenericNames(raw);

            let plotId = null;
            if (parsed.plotId) {
                const matched = plots.find(
                    (p) =>
                        p.name.toLowerCase().includes(parsed.plotId.toLowerCase()) ||
                        parsed.plotId.toLowerCase().includes(p.name.toLowerCase()),
                );
                plotId = matched?.id ?? null;
            }

            setNoteForm((f) => ({
                ...f,
                activity_type:         normalizeActivityType(parsed.type, f.activity_type),
                plot_id:               plotId                  || f.plot_id,
                chemical_name:         parsed.chemicalName     || f.chemical_name,
                chemical_qty:          parsed.quantity         || f.chemical_qty,
                kg_harvested:          parsed.kg_harvested     || f.kg_harvested,
                price_per_kg:          parsed.price_per_kg     || f.price_per_kg,
                quality_grade:         parsed.quality_grade    || f.quality_grade,
                buyer_name:            parsed.buyer_name       || f.buyer_name,
                pruned_count:          parsed.pruned_count     || f.pruned_count,
                pruning_type:          parsed.pruning_type     || f.pruning_type,
                inspection_type:       parsed.inspection_type  || f.inspection_type,
                inspection_status:     parsed.inspection_status || f.inspection_status,
                temperature_am:        parsed.temperature      || f.temperature_am,
                humidity:              parsed.humidity         || f.humidity,
                disease_name_observed: parsed.disease_name     || f.disease_name_observed,
                scout_severity:        normalizeScoutSeverity(parsed.severity, f.scout_severity),
                expense_amount:        parsed.expense_amount   || f.expense_amount,
                expense_category:      parsed.expense_category || f.expense_category,
                note:                  parsed.notes            || text,
            }));

            setEnhanceText('');
            notifySuccess?.(
                t?.('form.enhanceSuccess') || 'Log enhanced — please review the fields below.',
            );
        } catch (error) {
            console.error('Auto-Enhance failed:', error);
            notifyError?.(
                t?.('error.aiEnhanceFailed') ||
                'AI enhancement failed. Please check your backend connection.',
            );
        } finally {
            setEnhancing(false);
        }
    };

    return {
        aiInsights,
        generatingInsights,
        enhancing,
        enhanceText,
        setEnhanceText,
        handleGenerateInsights,
        handleAutoEnhance,
    };
};
