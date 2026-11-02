// Columns added by neon/migrations/0002 and 0003. If the server is deployed before that
// migration runs, Postgres reports an undefined column (42703). Rather than
// failing the save, the structured values are folded into the free-text notes
// so nothing the farmer entered is lost.
export const OPTIONAL_COLUMNS = Object.freeze({
    mygap_logs: ['activity_date', 'plot_id', 'crop', 'product_used', 'quantity', 'operator', 'active_ingredient', 'registration_no', 'area_treated', 'target_pest', 'phi_days', 'linked_scan_id', 'updated_at', 'amount', 'unit', 'supplier', 'price', 'buyer', 'lot_code', 'topic', 'attendees'],
});

const LABELS = {
    activity_date: 'Date', plot_id: 'Plot', crop: 'Crop',
    product_used: 'Product', quantity: 'Quantity recorded', operator: 'Operator',
    active_ingredient: 'Active ingredient', registration_no: 'LRMP no.', area_treated: 'Area treated',
    target_pest: 'Target pest/disease', phi_days: 'PHI days', linked_scan_id: 'Scan', updated_at: 'Corrected',
    amount: 'Amount', unit: 'Unit', supplier: 'Supplier', price: 'Price', buyer: 'Buyer', lot_code: 'Lot', topic: 'Training topic', attendees: 'Attendees',
};

export const isUndefinedColumnError = (error) => error?.code === '42703';

export const foldOptionalColumns = (table, row = {}) => {
    const optional = OPTIONAL_COLUMNS[table] || [];
    const details = optional
        .filter((field) => row[field] != null && String(row[field]).trim() !== '')
        .map((field) => `${LABELS[field] || field}: ${String(row[field]).trim()}`);
    const folded = Object.fromEntries(Object.entries(row).filter(([field]) => !optional.includes(field)));
    if (details.length) {
        const notes = String(folded.notes || '').trim();
        folded.notes = [notes, `[${details.join(' | ')}]`].filter(Boolean).join('\n');
    }
    return folded;
};
