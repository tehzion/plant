import { describe, expect, it } from 'vitest';
import { estimateImageQuality } from './diseaseDetection.js';
describe('photo quality for affected organs', () => {
    it('accepts a sharp yellow/brown image without relying on green coverage', () => {
        const width = 32, height = 32, data = new Uint8ClampedArray(width * height * 4);
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            data.set((Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? [210, 160, 15, 255] : [130, 100, 30, 255], (y * width + x) * 4);
        }
        const quality = estimateImageQuality({ data, width, height });
        expect(quality.greenRatio).toBe(0); expect(quality.flags).toEqual([]);
        expect(quality.qualityConfidence).toBeGreaterThan(70);
    });
});
