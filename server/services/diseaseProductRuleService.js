import { createClient } from '@supabase/supabase-js';
import NodeCache from 'node-cache';
import {
    DEFAULT_DISEASE_PRODUCT_RULES,
    normalizeDiseaseProductRule,
} from '../data/diseaseProductRules.js';

const RULE_CACHE_KEY = 'disease_product_rules';
const ruleCache = new NodeCache({ stdTTL: 600 });

const getSupabaseRuleConfig = () => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY
        || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
        || process.env.SUPABASE_ANON_KEY
        || process.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) return null;
    return { url, key };
};

let ruleClient = null;

const getRuleClient = () => {
    const config = getSupabaseRuleConfig();
    if (!config) return null;

    if (!ruleClient) {
        ruleClient = createClient(config.url, config.key, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });
    }

    return ruleClient;
};

export const getDiseaseProductRules = async () => {
    const cached = ruleCache.get(RULE_CACHE_KEY);
    if (cached) return cached;

    const client = getRuleClient();
    if (!client) {
        return DEFAULT_DISEASE_PRODUCT_RULES;
    }

    try {
        const { data, error } = await client
            .from('disease_product_rules')
            .select('id, display_name, crop_aliases, disease_aliases, pathogen_types, product_tags, active_ingredients, recommendation_roles, caution, priority, enabled')
            .eq('enabled', true)
            .order('priority', { ascending: true });

        if (error) {
            console.warn('⚠️ Supabase disease-product rules unavailable, using bundled rules:', error.message);
            return DEFAULT_DISEASE_PRODUCT_RULES;
        }

        const rules = (Array.isArray(data) ? data : [])
            .map(normalizeDiseaseProductRule)
            .filter((rule) => rule.enabled && rule.id);

        if (rules.length === 0) {
            return DEFAULT_DISEASE_PRODUCT_RULES;
        }

        ruleCache.set(RULE_CACHE_KEY, rules);
        return rules;
    } catch (error) {
        console.warn('⚠️ Supabase disease-product rule fetch failed, using bundled rules:', error.message);
        return DEFAULT_DISEASE_PRODUCT_RULES;
    }
};
