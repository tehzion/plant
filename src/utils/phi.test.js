import { describe, expect, it } from 'vitest';
import { calculateSafeHarvestDate, MAX_PHI_DAYS, parsePHIDays } from './phi.js';

describe('PHI helpers', () => {
    it('accepts whole non-negative PHI values within the supported range', () => {
        expect(parsePHIDays('0')).toBe(0);
        expect(parsePHIDays('14')).toBe(14);
        expect(parsePHIDays(String(MAX_PHI_DAYS))).toBe(MAX_PHI_DAYS);
    });

    it('rejects unsafe or ambiguous PHI input', () => {
        expect(parsePHIDays('')).toBeNull();
        expect(parsePHIDays('-1')).toBeNull();
        expect(parsePHIDays('1.5')).toBeNull();
        expect(parsePHIDays(String(MAX_PHI_DAYS + 1))).toBeNull();
    });

    it('calculates from the local calendar date', () => {
        const start = new Date(2026, 9, 24, 15, 30);
        const result = calculateSafeHarvestDate(14, start);
        expect(result.getFullYear()).toBe(2026);
        expect(result.getMonth()).toBe(10);
        expect(result.getDate()).toBe(7);
        expect(result.getHours()).toBe(0);
    });
});
