import { describe, expect, it } from 'vitest';
import { getStandardizedStatus, isHealthy } from './statusUtils';

describe('statusUtils', () => {
    it('treats a clear no-issue diagnosis as healthy even if severity is low', () => {
        const scan = {
            disease: 'Tiada Masalah Dikesan',
            severity: 'low',
            healthStatus: 'unhealthy',
            status: 'uncertain',
        };

        expect(isHealthy(scan)).toBe(true);
        expect(getStandardizedStatus(scan)).toBe('healthy');
    });

    it('keeps explicit disease findings unhealthy', () => {
        const scan = {
            disease: 'Leaf blight',
            severity: 'low',
            healthStatus: 'healthy',
        };

        expect(isHealthy(scan)).toBe(false);
        expect(getStandardizedStatus(scan)).toBe('unhealthy');
    });
});
