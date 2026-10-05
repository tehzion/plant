// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ client: null }));
vi.mock('../utils/supabaseAuth.js', () => ({ getServiceClient: () => mocks.client }));
import { consumeAiQuota } from './aiQuotaService.js';

describe('AI quota service', () => {
    beforeEach(() => { mocks.client = null; });
    it('limits a shared in-memory identity when Supabase is unavailable', async () => {
        expect((await consumeAiQuota({ identity: 'guest-a', limit: 1 })).allowed).toBe(true);
        expect((await consumeAiQuota({ identity: 'guest-a', limit: 1 })).allowed).toBe(false);
    });
});
