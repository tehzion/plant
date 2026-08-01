import { describe, expect, it } from 'vitest';
import {
    buildDiseaseProductRuleContext,
    getDiseaseProductRuleMatches,
} from './diseaseProductRules.js';

describe('disease product rule matching', () => {
    it('matches coconut leaf spot scans to coconut-specific treatment tags', () => {
        const context = buildDiseaseProductRuleContext({
            plantType: 'Kelapa',
            disease: 'Likely coconut leaf blight',
            pathogenType: 'fungal',
            symptoms: ['brown leaf lesions', 'grey leaf spot pattern'],
            productSearchTags: ['leaf-spot'],
        }, 'treatment');

        expect(context.primaryRule?.id).toBe('coconut_leaf_spot_blight');
        expect(context.productTags).toEqual(expect.arrayContaining(['coconut', 'leaf-spot', 'copper', 'mancozeb']));
        expect(context.activeIngredients).toEqual(expect.arrayContaining(['copper', 'mancozeb']));
        expect(context.cautionNotes[0]).toMatch(/close-up leaf lesions/i);
    });

    it('prioritizes banana Sigatoka over generic fungal leaf spot rules', () => {
        const matches = getDiseaseProductRuleMatches({
            plantType: 'Pisang',
            disease: 'Black Sigatoka leaf streak',
            pathogenType: 'fungal',
            symptoms: ['dark streaks on banana leaf'],
            productSearchTags: ['sigatoka', 'leaf-spot'],
        });

        expect(matches[0].rule.id).toBe('banana_sigatoka_leaf_spot');
        expect(matches[0].matchedTerms).toEqual(expect.arrayContaining(['pisang', 'sigatoka']));
    });

    it('maps fruit fly scan evidence to trap and bait product guidance', () => {
        const context = buildDiseaseProductRuleContext({
            plantType: 'Mango',
            disease: 'Fruit fly damage',
            pathogenType: 'pest',
            symptoms: ['puncture mark', 'fruit drop', 'maggot found inside fruit'],
            productSearchTags: ['fruit-fly'],
        }, 'treatment');

        expect(context.primaryRule?.id).toBe('fruit_fly_trap_support');
        expect(context.productTags).toEqual(expect.arrayContaining(['fruit-fly', 'trap', 'methyl-eugenol']));
        expect(context.activeIngredients).toEqual(expect.arrayContaining(['methyl eugenol', 'protein bait']));
        expect(context.cautionNotes[0]).toMatch(/traps and sanitation first/i);
    });
});
