// Explicit source naming equivalents, not inferred from disease predictions.
export function canonicalCrop(value) {
    const text=String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
    return ({'corn (maize)':'corn',maize:'corn','pepper, bell':'bell pepper','cherry (including sour)':'cherry'})[text] || text;
}
