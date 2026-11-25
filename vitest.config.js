import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        // Nested checkouts have their own dependencies and must run their own suite.
        exclude: [...configDefaults.exclude, '**/.claude/worktrees/**'],
        setupFiles: './src/test/setup.js',
        globals: true,
    },
});
