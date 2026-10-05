import { getServiceClient } from '../utils/supabaseAuth.js';

const MAX_ROWS = 10000;

const parseDate = (value, fallback) => {
    if (!value) return fallback;
    const text = String(value).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return fallback;
    const date = new Date(`${text}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? fallback : date;
};

const decimal = (value) => Number(value || 0).toFixed(2);

const fetchRows = async (client, table, userId, from, to, plotId) => {
    let query = client.from(table).select('*').eq('user_id', userId)
        .gte('created_at', from.toISOString()).lt('created_at', to.toISOString())
        .order('created_at', { ascending: true }).limit(MAX_ROWS);
    if (plotId && table === 'daily_notes') query = query.eq('plot_id', plotId);
    if (plotId && table === 'scan_history') query = query.contains('result_json', { plot_id: plotId });
    const { data, error } = await query;
    if (error) throw error;
    return Array.isArray(data) ? data : [];
};

export const getReportSummary = async (userId, { from, to, plotId } = {}) => {
    const client = getServiceClient();
    if (!client) {
        const error = new Error('Reports are temporarily unavailable.');
        error.status = 503;
        throw error;
    }
    const start = parseDate(from, new Date(Date.now() - 365 * 86400000));
    const end = parseDate(to, new Date(Date.now() + 86400000));
    if (end <= start) {
        const error = new Error('Report end date must be after the start date.');
        error.status = 400;
        throw error;
    }
    const [notes, scans] = await Promise.all([
        fetchRows(client, 'daily_notes', userId, start, end, plotId),
        fetchRows(client, 'scan_history', userId, start, end, plotId),
    ]);
    const harvest = notes.filter((note) => note.activity_type === 'harvest');
    const totalKg = harvest.reduce((sum, note) => sum + (Number(note.kg_harvested) || 0), 0);
    const revenue = harvest.reduce((sum, note) => sum + ((Number(note.kg_harvested) || 0) * (Number(note.price_per_kg) || 0)), 0);
    const expenses = notes.reduce((sum, note) => sum + (Number(note.expense_amount) || 0), 0);
    const states = { healthy: 0, diseased: 0, uncertain: 0 };
    const monthly = new Map();
    scans.forEach((scan) => {
        const result = scan.result_json && typeof scan.result_json === 'object' ? scan.result_json : {};
        const state = String(result.resultState || result.status || result.healthStatus || '').toLowerCase();
        if (state.includes('healthy')) states.healthy += 1;
        else if (state.includes('uncertain') || result.needsMoreEvidence || result.requiresRetake || result.abstainReason) states.uncertain += 1;
        else states.diseased += 1;
        const month = String(scan.created_at || '').slice(0, 7);
        if (month) monthly.set(month, (monthly.get(month) || 0) + 1);
    });
    return {
        from: start.toISOString(), to: end.toISOString(), plotId: plotId || null,
        currency: 'MYR',
        totals: { harvestKg: decimal(totalKg), revenue: decimal(revenue), expenses: decimal(expenses), profit: decimal(revenue - expenses) },
        scanStates: states,
        monthly: [...monthly.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([month, scansCount]) => ({ month, scans: scansCount })),
        recordCounts: { notes: notes.length, scans: scans.length },
        truncated: notes.length >= MAX_ROWS || scans.length >= MAX_ROWS,
    };
};
