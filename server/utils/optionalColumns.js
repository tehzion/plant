// Columns added by neon/migrations/0002. If the server is deployed before that
// migration runs, Postgres reports an undefined column (42703). Rather than
// failing the save, the structured values are folded into the free-text notes
// so nothing the farmer entered is lost.
export const OPTIONAL_COLUMNS = Object.freeze({
    mygap_logs: ['activity_date', 'plot_id', 'crop', 'product_used', 'quantity', 'operator'],
});

const LABELS = {
    activity_date: 'Date', plot_id: 'Plot', crop: 'Crop',
    product_used: 'Product', quantity: 'Quantity recorded', operator: 'Operator',
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
