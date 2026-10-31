import { describe, expect, it } from 'vitest';
import { compareCase, calculateMetrics } from './metrics.js';
import { prepareManifest } from './manifest.js';
const ref = { crop: 'Tomato', label: 'Early blight', supported: true };
const prediction = { completed: true, crop: 'tomato', label: 'early blight', healthStatus: 'unhealthy' };
describe('evaluation integrity', () => {
    it('keeps unsupported, failures and abstentions distinct from incorrect answers', () => {
        expect(compareCase(ref, prediction)).toBe('exact_match');
        expect(compareCase(ref, { ...prediction, uncertain: true })).toBe('uncertain_or_abstained');
        expect(compareCase(ref, { error: 'timeout' })).toBe('processing_failure');
        expect(compareCase({ ...ref, supported: false }, prediction)).toBe('unsupported_category');
        expect(compareCase(ref, { ...prediction, label: 'late blight' })).toBe('crop_match_condition_mismatch');
        expect(compareCase(ref, { ...prediction, label: 'alternaria' }, { alternaria: 'early blight' })).toBe('approved_synonym_match');
    });
    it('uses explicit denominators and does not hide failure or abstention', () => {
        const rows = [ { source: 'PlantVillage', reference: ref, prediction }, { source: 'PlantVillage', reference: ref, prediction: { error: 'timeout' } }, { source: 'PlantDoc', reference: ref, prediction: { ...prediction, uncertain: true } } ];
        const all = calculateMetrics(rows);
        expect(all.completion).toMatchObject({ numerator: 2, denominator: 3 });
        expect(all.coverage).toMatchObject({ numerator: 1, denominator: 3 });
        expect(all.diagnosticAgreement).toMatchObject({ numerator: 1, denominator: 1 });
        expect(calculateMetrics(rows, { source: 'PlantDoc' }).diagnosticAgreement.value).toBeNull();
    });
    it('selects deterministically and rejects duplicate images and uncleared rights', () => {
        const base = { source:'PlantVillage', crop:'Tomato', originalLabel:'healthy', normalizedLabel:'healthy', category:'healthy', license:'cleared', sourceReference:'source', datasetVersion:'commit', rightsCleared:true, imageVerified:true };
        const items = [{...base,imageId:'a',originalId:'a',checksum:'a'.repeat(64)}, {...base,imageId:'b',originalId:'b',checksum:'a'.repeat(64)}, {...base,imageId:'c',originalId:'c',checksum:'c'.repeat(64),rightsCleared:false}];
        const one = prepareManifest(items, {seed:42});
        expect(one).toEqual(prepareManifest(items, {seed:42}));
        expect(one.selected).toHaveLength(1); expect(one.rejected).toHaveLength(2); expect(one.shortfalls.healthy).toBe(19);
    });
});
describe('crop-specific evidence', () => {
    it('keeps unrelated crops out of crop-specific denominators', () => {
        const cases=[{source:'PlantVillage',reference:ref,prediction},{source:'PlantDoc',reference:{crop:'potato',label:'healthy',supported:true},prediction:{...prediction,crop:'potato',label:'healthy'}}];
        expect(calculateMetrics(cases,{crop:'tomato'}).attempted).toBe(1);
        expect(calculateMetrics(cases,{crop:'potato'}).attempted).toBe(1);
    });
});
