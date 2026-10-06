import * as supabaseAuth from '../utils/supabaseAuth.js';

const getAuthenticatedClient = supabaseAuth.getAuthenticatedClient;
const getServiceClient = supabaseAuth.getServiceClient;

const DEFAULT_TIMEZONE = 'Asia/Kuala_Lumpur';

const zonedMidnight = (value, timezone, fallback) => {
    if (!value) return fallback;
    const text = String(value).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return fallback;
    try {
        const [year, month, day] = text.split('-').map(Number);
        let utc = Date.UTC(year, month - 1, day);
        const offsetParts = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone || DEFAULT_TIMEZONE,
            hour12: false,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        }).formatToParts(new Date(utc));
        const values = Object.fromEntries(offsetParts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
        const asUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second));
        utc -= asUtc - utc;
        return new Date(utc);
    } catch {
        return fallback;
    }
};

const decimal = (value) => Number(value || 0).toFixed(2);

const fetchRows = async (client, table, userId, from, to, plotId) => {
    const rows = [];
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
        let query = client.from(table).select('*', { count: 'exact' }).eq('user_id', userId)
            .gte('created_at', from.toISOString()).lt('created_at', to.toISOString())
            .order('created_at', { ascending: true }).order('id', { ascending: true });
        if (plotId && table === 'daily_notes') query = query.eq('plot_id', plotId);
        if (plotId && table === 'scan_history') query = query.eq('plot_id', plotId);
        const result = typeof query.range === 'function'
            ? await query.range(offset, offset + pageSize - 1)
            : await query.limit(pageSize);
        if (result.error) throw result.error;
        const page = Array.isArray(result.data) ? result.data : [];
        rows.push(...page);
        if (!page.length || page.length < pageSize || (result.count != null && rows.length >= result.count)) return rows;
    }
};

export const getReportSummary = async (userId, { from, to, plotId, timezone = DEFAULT_TIMEZONE, accessToken = null } = {}) => {
    const client = (typeof getAuthenticatedClient === 'function' ? getAuthenticatedClient(accessToken) : null) || getServiceClient();
    if (!client) {
        const error = new Error('Reports are temporarily unavailable.');
        error.status = 503;
        throw error;
    }
    const start = zonedMidnight(from, timezone, new Date(Date.now() - 365 * 86400000));
    const end = zonedMidnight(to, timezone, new Date(Date.now() + 86400000));
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
    const monthFor = (value) => {
        const date = new Date(value || start);
        if (Number.isNaN(date.getTime())) return 'unknown';
        return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || DEFAULT_TIMEZONE, year: 'numeric', month: '2-digit' }).format(date);
    };
    const getMonth = (month) => monthly.get(month) || { month, scans: 0, harvestKg: 0, revenue: 0, expenses: 0, profit: 0 };
    notes.forEach((note) => {
        const month = monthFor(note.created_at);
        const item = getMonth(month);
        item.harvestKg += Number(note.kg_harvested) || 0;
        item.revenue += (Number(note.kg_harvested) || 0) * (Number(note.price_per_kg) || 0);
        item.expenses += Number(note.expense_amount) || 0;
        item.profit = item.revenue - item.expenses;
        monthly.set(month, item);
    });
    scans.forEach((scan) => {
        const result = scan.result_json && typeof scan.result_json === 'object' ? scan.result_json : {};
        const state = String(result.resultState || result.status || result.healthStatus || '').toLowerCase();
        if (state.includes('healthy')) states.healthy += 1;
        else if (state.includes('uncertain') || result.needsMoreEvidence || result.requiresRetake || result.abstainReason) states.uncertain += 1;
        else states.diseased += 1;
        const month = monthFor(scan.created_at);
        const item = getMonth(month);
        item.scans += 1;
        monthly.set(month, item);
    });
    return {
        from: start.toISOString(), to: end.toISOString(), plotId: plotId || null,
        currency: 'MYR',
        totals: { harvestKg: decimal(totalKg), revenue: decimal(revenue), expenses: decimal(expenses), profit: decimal(revenue - expenses) },
        scanStates: states,
        timezone: timezone || DEFAULT_TIMEZONE,
        monthly: [...monthly.values()].sort((left, right) => left.month.localeCompare(right.month)).map((item) => ({
            ...item,
            harvestKg: decimal(item.harvestKg),
            revenue: decimal(item.revenue),
            expenses: decimal(item.expenses),
            profit: decimal(item.profit),
        })),
        recordCounts: { notes: notes.length, scans: scans.length },
        truncated: false,
    };
};

export const getScanHistoryPage = async (userId, { cursor = null, limit = 20, accessToken = null } = {}) => {
    const client = (typeof getAuthenticatedClient === 'function' ? getAuthenticatedClient(accessToken) : null) || getServiceClient();
    if (!client) {
        const error = new Error('History is temporarily unavailable.');
        error.status = 503;
        throw error;
    }
    const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);
    if (cursor && (!cursor.createdAt || !/^\d{4}-\d{2}-\d{2}T[\d:.+-]+Z$/.test(String(cursor.createdAt)) || !/^[A-Za-z0-9_-]{1,200}$/.test(String(cursor.id || '')))) {
        const error = new Error('Invalid history cursor.');
        error.status = 400;
        throw error;
    }
    let query = client.from('scan_history')
        .select('id,disease,confidence,severity,category,scale,location_name,plot_id,result_json,image_path,leaf_image_path,created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(pageSize + 1);
    if (cursor?.createdAt && cursor?.id && typeof query.or === 'function') {
        const createdAt = String(cursor.createdAt).replace(/[(),]/g, '');
        const id = String(cursor.id).replace(/[(),]/g, '');
        query = query.or(`created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`);
    }
    const { data, error } = await query;
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    const hasMore = rows.length > pageSize;
    const page = hasMore ? rows.slice(0, pageSize) : rows;
    const last = page[page.length - 1];
    return {
        rows: page,
        nextCursor: hasMore && last ? { createdAt: last.created_at, id: last.id } : null,
    };
};
