import NodeCache from 'node-cache';
import { queryNeon } from '../utils/neonDatabase.js';
import {
    DEFAULT_DISEASE_PRODUCT_RULES,
    normalizeDiseaseProductRule,
} from '../data/diseaseProductRules.js';

const RULE_CACHE_KEY = 'disease_product_rules';
const ruleCache = new NodeCache({ stdTTL: 600 });

export const getDiseaseProductRules = async () => {
    const cached = ruleCache.get(RULE_CACHE_KEY);
    if (cached) return cached;

    try {
        const { rows } = await queryNeon('select id,display_name,crop_aliases,disease_aliases,pathogen_types,product_tags,active_ingredients,recommendation_roles,caution,priority,enabled from public.disease_product_rules where enabled = true order by priority asc', []);

        const rules = (Array.isArray(rows) ? rows : [])
            .map(normalizeDiseaseProductRule)
            .filter((rule) => rule.enabled && rule.id);

        if (rules.length === 0) {
            return DEFAULT_DISEASE_PRODUCT_RULES;
        }

        ruleCache.set(RULE_CACHE_KEY, rules);
        return rules;
    } catch (error) {
        console.warn('⚠️ Neon disease-product rule fetch failed, using bundled rules:', error.message);
        return DEFAULT_DISEASE_PRODUCT_RULES;
    }
};
