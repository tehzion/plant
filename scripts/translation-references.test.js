// @vitest-environment node
import { expect, it } from 'vitest';
import { collectTranslationReferences, findMissingTranslationReferences } from './translation-references.mjs';
const collect = source => collectTranslationReferences(source, { filename: 'sample.jsx', namespaces: ['results', 'profile'] });
it('catches keys missing in every language even when dictionaries align', () => {
    const references = collect("const value = t('results.itemsSelected') || 'Items selected';");
    expect(findMissingTranslationReferences(references, { en: { results: {} }, ms: { results: {} }, zh: { results: {} } })).toEqual([
        expect.objectContaining({ key: 'results.itemsSelected', languages: ['en', 'ms', 'zh'] }),
    ]);
});
it('checks configuration labels, safe fallbacks and unknown namespaces', () => {
    const references = collect("const action = { labelKey: 'profile.quickScan' }; label('newScreen.title', 'Title'); getLabel(t, 'results.buy', 'Buy');");
    expect(references.map(({ key }) => key)).toEqual(expect.arrayContaining(['profile.quickScan', 'newScreen.title', 'results.buy']));
});
it('ignores comments, unrelated strings and computed fragments', () => {
    expect(collect("// t('results.oldKey')\nconst label = 'example.com'; t(`results.${name}`);")).toEqual([]);
});
it('handles JSX and static template literals without executing source', () => {
    expect(collect('const node = <span>{t(`results.total`)}</span>;')).toEqual([expect.objectContaining({ key: 'results.total', line: 1 })]);
});
it('rejects empty or self-referential translations but accepts structured copy', () => {
    const refs = ['results.a', 'results.b', 'results.list'].map(key => ({ key, file: 'sample.jsx', line: 1 }));
    const missing = findMissingTranslationReferences(refs, { en: { results: { a: '', b: 'results.b', list: ['One'] } } });
    expect(missing.map(({ key }) => key)).toEqual(['results.a', 'results.b']);
});
it('reports a language-specific gap instead of accepting an English fallback', () => {
    const refs = collect("t('results.total')");
    expect(findMissingTranslationReferences(refs, { en: { results: { total: 'Total' } }, ms: { results: {} } })[0].languages).toEqual(['ms']);
});
