import crypto from 'node:crypto';
import { resolveAiProvider } from './aiProvider.js';

// Increment whenever diagnosis prompts or normalization rules change.
export const ANALYSIS_VERSION = '4';

export const buildAnalysisCacheKey = ({ treeImage, image, leafImage, category, crop, language = 'en', location, imageQuality }) => {
    const ai = resolveAiProvider();
    const context = {
        version: ANALYSIS_VERSION,
        provider: ai.provider,
        model: ai.primaryModel,
        fallbackModel: ai.fallbackModel,
        mainImage: treeImage || image,
        leafImage: leafImage || null,
        category: category || null,
        crop: crop || null,
        language,
        location: location || null,
        imageQuality: imageQuality || null,
    };
    return `analyze_${crypto.createHash('sha256').update(JSON.stringify(context)).digest('hex')}`;
};
