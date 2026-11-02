import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';

const KEY = /^[A-Za-z]\w*(?:\.[A-Za-z]\w*)+$/;
const HELPERS = new Set(['t', 'label', 'safeLabel', 'getLabel']);
const literal = node => node?.type === 'StringLiteral' ? node.value
    : node?.type === 'TemplateLiteral' && node.expressions.length === 0 ? node.quasis[0].value.cooked : null;

// Parse source rather than grepping: comments are ignored, and configuration
// keys (e.g. dashboard action.labelKey) are included alongside direct calls.
export const collectTranslationReferences = (source, { filename = 'source.jsx', namespaces = [] } = {}) => {
    const ast = parse(source, { sourceType: 'module', plugins: ['jsx'], sourceFilename: filename });
    const roots = new Set(namespaces);
    const references = new Map();
    const record = node => {
        const key = literal(node);
        if (!key || !KEY.test(key)) return;
        const line = node.loc.start.line;
        references.set(`${line}:${key}`, { key, file: filename, line });
    };
    const visit = node => {
        if (!node || typeof node !== 'object') return;
        const value = literal(node);
        if (value && roots.has(value.split('.')[0])) record(node);
        if (['CallExpression', 'OptionalCallExpression'].includes(node.type)) {
            const helper = node.callee.type === 'Identifier' ? node.callee.name : node.callee.property?.name;
            if (HELPERS.has(helper)) {
                // getLabel(t, key, fallback) has its key in the second position.
                record(node.arguments[helper === 'getLabel' ? 1 : 0]);
            }
        }
        for (const value of Object.values(node)) {
            if (Array.isArray(value)) value.forEach(visit);
            else if (value && typeof value === 'object') visit(value);
        }
    };
    visit(ast.program);
    return [...references.values()];
};

export const findMissingTranslationReferences = (references, dictionaries) => references.flatMap(reference => {
    const languages = Object.keys(dictionaries).filter(language => {
        const value = reference.key.split('.').reduce((current, key) => current?.[key], dictionaries[language]);
        return value == null || value === false || value === 0 || value === '' || value === reference.key;
    });
    return languages.length ? [{ ...reference, languages }] : [];
});

export const scanTranslationReferences = (root, namespaces) => {
    const sourceRoot = path.join(root, 'src');
    const files = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) return ['i18n', 'test', '__tests__'].includes(entry.name) ? [] : files(file);
        return /\.(?:js|jsx|mjs)$/.test(entry.name) && !/\.(?:test|spec)\./.test(entry.name) ? [file] : [];
    });
    return files(sourceRoot).sort().flatMap(file => collectTranslationReferences(fs.readFileSync(file, 'utf8'), {
        filename: path.relative(root, file).split(path.sep).join('/'), namespaces,
    }));
};
