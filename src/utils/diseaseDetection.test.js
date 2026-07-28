import { describe, expect, it } from 'vitest';
import { getImageQualityGuidanceFromMetrics } from './diseaseDetection.js';

describe('image quality guidance', () => {
    it('accepts images without quality flags', () => {
        expect(getImageQualityGuidanceFromMetrics({
            brightness: 120,
            blurScore: 22,
            greenRatio: 0.18,
            flags: [],
        })).toMatchObject({
            accepted: true,
            blocking: false,
            code: '',
        });
    });

    it('blocks dark, blurry, and distant plant photos before scan', () => {
        expect(getImageQualityGuidanceFromMetrics({ flags: ['too_dark'] })).toMatchObject({
            accepted: false,
            code: 'IMAGE_TOO_DARK',
            messageKey: 'home.errorImageTooDark',
        });

        expect(getImageQualityGuidanceFromMetrics({ flags: ['too_blurry'] })).toMatchObject({
            accepted: false,
            code: 'IMAGE_TOO_BLURRY',
            messageKey: 'home.errorImageTooBlurry',
        });

        expect(getImageQualityGuidanceFromMetrics({ flags: ['too_little_leaf'] })).toMatchObject({
            accepted: false,
            code: 'IMAGE_TOO_LITTLE_LEAF',
            messageKey: 'home.errorImageTooLittleLeaf',
        });
    });
});
