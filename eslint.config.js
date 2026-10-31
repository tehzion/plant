import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
    { ignores: ['dist/**', 'node_modules/**', 'server/node_modules/**', 'server/dataset/**', 'public/**', 'docs/**', 'supabase/**', 'neon.ts'] },
    js.configs.recommended,
    {
        files: ['**/*.{js,jsx,mjs}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: { ecmaFeatures: { jsx: true } },
            globals: { ...globals.browser, ...globals.node },
        },
        plugins: { react, 'react-hooks': reactHooks },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react/jsx-uses-vars': 'error',
            'react/jsx-uses-react': 'error',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_|^React$', caughtErrors: 'none' }],
        },
    },
    {
        files: ['src/**/*.{js,jsx}'],
        languageOptions: { globals: { __APP_VERSION__: 'readonly' } },
    },
    {
        files: ['**/*.cjs'],
        languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } },
    },
    {
        // Mirrors the upstream ansi-regex pattern, which matches ESC on purpose.
        files: ['scripts/vitest-shims/ansi-regex.cjs'],
        rules: { 'no-control-regex': 'off' },
    },
    {
        files: ['**/*.test.{js,jsx}', 'src/test/**', 'vitest.config.js'],
        languageOptions: { globals: { ...globals.vitest } },
    },
];
