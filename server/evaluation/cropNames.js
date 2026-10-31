// Explicit source naming equivalents, not inferred from disease predictions.
export function canonicalCrop(value) {
    const text=String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
    const mapped = ({'corn (maize)':'corn',maize:'corn','pepper, bell':'bell pepper','cherry (including sour)':'cherry'})[text] || text;
    // Model display names often append a scientific binomial to the common name.
    return mapped.replace(/\s*\([a-z]+ [a-z]+(?: [a-z]+)?\)$/, '').trim();
}
