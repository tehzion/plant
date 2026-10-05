const fields = new Set([
    'id', 'created_at', 'timestamp', 'activity_type', 'type', 'plot_id', 'chemical_name', 'chemical_qty',
    'disease_name_observed', 'scout_severity', 'kg_harvested', 'price_per_kg', 'expense_amount',
    'note', 'notes', 'disease', 'title', 'category', 'severity', 'healthStatus',
    'cropType', 'crop_type', 'name', 'area', 'unit', 'soil_ph', 'npk_n', 'npk_p', 'npk_k',
]);

// Match the backend's recent-record summaries; reports retain the complete data.
export const prepareAiFarmContext = (records = [], limit = 12) => (
    (Array.isArray(records) ? records : []).filter(Boolean)
        .sort((a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0))
        .slice(0, limit)
        .map((row) => Object.fromEntries(Object.entries(row)
            .filter(([key, value]) => fields.has(key)
                && (value == null || ['string', 'number', 'boolean'].includes(typeof value)))
            .map(([key, value]) => [key, typeof value === 'string' ? value.slice(0, ['note', 'notes'].includes(key) ? 1000 : 200) : value])))
);
