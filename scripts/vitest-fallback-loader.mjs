import { resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';

const REDIRECTS = new Map([
    [
        'convert-source-map',
        pathToFileURL(resolvePath(process.cwd(), 'scripts/vitest-shims/convert-source-map.mjs')).href,
    ],
    [
        'estree-walker',
        pathToFileURL(resolvePath(process.cwd(), 'scripts/vitest-shims/estree-walker.mjs')).href,
    ],
    [
        '@jridgewell/sourcemap-codec',
        pathToFileURL(resolvePath(process.cwd(), 'scripts/vitest-shims/sourcemap-codec.mjs')).href,
    ],
    [
        '@testing-library/react',
        pathToFileURL(resolvePath(process.cwd(), 'scripts/vitest-shims/testing-library-react.mjs')).href,
    ],
    [
        'lucide-react',
        pathToFileURL(resolvePath(process.cwd(), 'node_modules/lucide-react/dist/esm/lucide-react.js')).href,
    ],
]);

export async function resolve(specifier, context, defaultResolve) {
    const redirected = REDIRECTS.get(specifier);
    if (redirected) {
        return {
            url: redirected,
            shortCircuit: true,
        };
    }

    return defaultResolve(specifier, context, defaultResolve);
}

export async function load(url, context, defaultLoad) {
    try {
        return await defaultLoad(url, context, defaultLoad);
    } catch (error) {
        console.error(`[vitest-loader] Failed to load ${url}`);
        throw error;
    }
}
