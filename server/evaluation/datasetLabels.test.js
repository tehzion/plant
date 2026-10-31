import { describe, expect, it } from 'vitest';
import { compareCondition, farmerCategory, referenceTerms } from './datasetLabels.js';

describe('dataset label comparison', () => {
    it('strips crop words and expands aliases', () => {
        expect(referenceTerms('Tomato leaf mosaic virus').terms).toContain('mosaic');
        expect(referenceTerms('Haunglongbing_(Citrus_greening)').terms).toContain('huanglongbing');
        expect(referenceTerms('healthy').healthy).toBe(true);
    });
    it('compares predictions conservatively', () => {
        expect(compareCondition('Late_blight', { disease: 'Late Blight', healthStatus: 'unhealthy' }, false)).toBe('match');
        expect(compareCondition('Late_blight', { disease: 'Early Blight', healthStatus: 'unhealthy' }, false)).toBe('different_or_unclear');
        expect(compareCondition('Late_blight', { disease: 'Early Blight' }, true)).toBe('uncertain_or_review');
        expect(compareCondition('healthy', { disease: 'No Issues', healthStatus: 'healthy' }, false)).toBe('match');
        expect(compareCondition('healthy', { disease: 'Leaf Spot', healthStatus: 'unhealthy' }, false)).toBe('different_or_unclear');
        expect(compareCondition('Common_rust_', null, false)).toBe('unassessed');
        expect(compareCondition('Tomato Septoria leaf spot', { disease: 'Septoria Leaf Spot' }, false)).toBe('match');
        expect(compareCondition('Corn Gray leaf spot', { disease: 'Gray Leaf Spot' }, false)).toBe('match');
    });
    it('maps crops to farmer categories', () => {
        expect(farmerCategory('Corn (maize)')).toBe('Corn');
        expect(farmerCategory('Pepper, bell')).toBe('Vegetables');
        expect(farmerCategory('Orange')).toBe('Fruits');
    });
});
