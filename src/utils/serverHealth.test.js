import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./diseaseDetection', () => ({ checkServerHealth: vi.fn() }));

import { checkServerHealth } from './diseaseDetection';
import { checkHealthOnce, hasRecentHealth, resetHealthCheckCache } from './serverHealth.js';

describe('serverHealth', () => {
    beforeEach(() => {
        resetHealthCheckCache();
        checkServerHealth.mockReset();
    });

    it('shares one request between callers while it is running', async () => {
        let finish;
        checkServerHealth.mockReturnValue(new Promise((resolve) => { finish = resolve; }));

        const first = checkHealthOnce();
        const second = checkHealthOnce();
        finish({ status: 'ok' });
        await Promise.all([first, second]);

        expect(checkServerHealth).toHaveBeenCalledTimes(1);
        expect(hasRecentHealth()).toBe(true);
    });

    it('forgets a success after a minute', async () => {
        checkServerHealth.mockResolvedValue({ status: 'ok' });
        await checkHealthOnce();

        expect(hasRecentHealth(Date.now() + 61000)).toBe(false);
    });

    it('does not remember a failed check', async () => {
        checkServerHealth.mockRejectedValue(new Error('down'));

        await expect(checkHealthOnce()).rejects.toThrow('down');
        expect(hasRecentHealth()).toBe(false);

        checkServerHealth.mockResolvedValue({ status: 'ok' });
        await checkHealthOnce();
        expect(checkServerHealth).toHaveBeenCalledTimes(2);
    });
});
