const Module = require('node:module');
const fs = require('node:fs');
const { resolve: resolvePath } = require('node:path');

const originalResolveFilename = Module._resolveFilename;
const originalReadFileSync = fs.readFileSync;
const compatResolutions = {
    '@babel/runtime/helpers/interopRequireDefault': resolvePath(process.cwd(), 'scripts/vitest-shims/babel-interop-require-default.cjs'),
    '@babel/runtime/helpers/interopRequireDefault.js': resolvePath(process.cwd(), 'scripts/vitest-shims/babel-interop-require-default.cjs'),
    '@testing-library/dom': resolvePath(process.cwd(), 'node_modules/@testing-library/dom/dist/index.js'),
    'react-dom/test-utils': resolvePath(process.cwd(), 'scripts/vitest-shims/react-dom-test-utils.cjs'),
    'ansi-regex': resolvePath(process.cwd(), 'scripts/vitest-shims/ansi-regex.cjs'),
};

fs.readFileSync = function patchedReadFileSync(filePath, ...args) {
    try {
        return originalReadFileSync.call(this, filePath, ...args);
    } catch (error) {
        if (error?.code === 'UNKNOWN') {
            console.error(`[vitest-require] Failed to read ${filePath}`);
        }
        throw error;
    }
};

Module._resolveFilename = function patchedResolveFilename(request, parent, isMain, options) {
    if (request === 'punycode/') {
        return originalResolveFilename.call(this, 'punycode', parent, isMain, options);
    }

    if (compatResolutions[request]) {
        return compatResolutions[request];
    }

    return originalResolveFilename.call(this, request, parent, isMain, options);
};
