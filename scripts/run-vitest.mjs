import { resolve as resolvePath } from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const requireShimPath = resolvePath(process.cwd(), 'scripts/vitest-require-shims.cjs');
const registerLoaderPath = resolvePath(process.cwd(), 'scripts/vitest-register-loader.mjs');
process.env.NODE_OPTIONS = [
    process.env.NODE_OPTIONS,
    `--require=${requireShimPath}`,
    `--import=${pathToFileURL(registerLoaderPath).href}`,
].filter(Boolean).join(' ');

register(new URL('./vitest-fallback-loader.mjs', import.meta.url));

process.argv = [
    process.execPath,
    resolvePath(process.cwd(), 'node_modules/vitest/vitest.mjs'),
    'run',
    '--config',
    'vitest.config.js',
    ...process.argv.slice(2),
];

await import('../node_modules/vitest/vitest.mjs');
