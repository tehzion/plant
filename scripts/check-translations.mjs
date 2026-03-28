import translations from '../src/i18n/translations.js';

const strict = process.argv.includes('--strict');
const baseLanguage = 'en';
const languages = Object.keys(translations);

const flattenKeys = (value, prefix = '') => {
    if (Array.isArray(value)) {
        return value.flatMap((item, index) => flattenKeys(item, `${prefix}[${index}]`));
    }

    if (value && typeof value === 'object') {
        return Object.entries(value).flatMap(([key, nestedValue]) =>
            flattenKeys(nestedValue, prefix ? `${prefix}.${key}` : key),
        );
    }

    return prefix ? [prefix] : [];
};

const baseKeys = new Set(flattenKeys(translations[baseLanguage]));
const report = [];

for (const language of languages) {
    if (language === baseLanguage) continue;

    const languageKeys = new Set(flattenKeys(translations[language]));
    const missingKeys = [...baseKeys].filter((key) => !languageKeys.has(key));
    const extraKeys = [...languageKeys].filter((key) => !baseKeys.has(key));

    report.push({
        language,
        missingKeys,
        extraKeys,
    });
}

const hasIssues = report.some(({ missingKeys, extraKeys }) => missingKeys.length > 0 || extraKeys.length > 0);

console.log(`Base language: ${baseLanguage}`);

if (!hasIssues) {
    console.log('Translation keys are aligned across all languages.');
    process.exit(0);
}

for (const { language, missingKeys, extraKeys } of report) {
    console.log(`\n[${language}]`);
    console.log(`Missing keys: ${missingKeys.length}`);
    if (missingKeys.length > 0) {
        missingKeys.slice(0, 20).forEach((key) => console.log(`  - ${key}`));
        if (missingKeys.length > 20) {
            console.log(`  ...and ${missingKeys.length - 20} more`);
        }
    }

    console.log(`Extra keys: ${extraKeys.length}`);
    if (extraKeys.length > 0) {
        extraKeys.slice(0, 20).forEach((key) => console.log(`  + ${key}`));
        if (extraKeys.length > 20) {
            console.log(`  ...and ${extraKeys.length - 20} more`);
        }
    }
}

if (strict) {
    process.exit(1);
}

console.log('\nTranslation differences reported without failing the command. Re-run with --strict to enforce alignment.');
