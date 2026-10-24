// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    Pool: vi.fn(),
    query: vi.fn(),
    end: vi.fn(),
}));

vi.mock('pg', () => ({ default: { Pool: mocks.Pool } }));

const { checkNeonDatabase } = await import('./neonDatabase.js');

describe('Neon database service', () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
        vi.clearAllMocks();
        mocks.Pool.mockImplementation(class MockPool {
            constructor() {
                this.query = (...args) => mocks.query(...args);
                this.end = (...args) => mocks.end(...args);
            }
        });
    });

    it('reports an unconfigured database without attempting a connection', async () => {
        const result = await checkNeonDatabase();

        expect(result).toEqual({ provider: 'neon', configured: false, connected: false });
        expect(mocks.Pool).not.toHaveBeenCalled();
    });

    it('uses the pooled DATABASE_URL and confirms a live query', async () => {
        vi.stubEnv('DATABASE_URL', 'postgresql://pooled.example/db');
        mocks.query.mockResolvedValue({ rows: [{ ok: 1 }] });

        const result = await checkNeonDatabase();

        expect(result).toEqual({ provider: 'neon', configured: true, connected: true });
        expect(mocks.Pool).toHaveBeenCalledWith(expect.objectContaining({ connectionString: 'postgresql://pooled.example/db' }));
        expect(mocks.query).toHaveBeenCalledWith('select 1 as ok');
    });

    it('returns a safe unavailable result when Neon cannot be reached', async () => {
        vi.stubEnv('DATABASE_URL', 'postgresql://pooled.example/db');
        mocks.query.mockRejectedValue(new Error('connection refused'));

        const result = await checkNeonDatabase();

        expect(result).toEqual({
            provider: 'neon',
            configured: true,
            connected: false,
            error: 'database_unavailable',
        });
    });
});
