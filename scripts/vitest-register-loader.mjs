import { register } from 'node:module';

register(new URL('./vitest-fallback-loader.mjs', import.meta.url));
