import crypto from 'node:crypto';

// Increment whenever diagnosis prompts or normalization rules change.
export const ANALYSIS_VERSION = '3';

export const buildAnalysisCacheKey = ({ treeImage, image, leafImage, category, language = 'en', location, imageQuality }) => {
    const context = {
        version: ANALYSIS_VERSION,
        model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
        fallbackModel: process.env.OPENAI_FALLBACK_MODEL || 'gpt-5-mini',
        mainImage: treeImage || image,
        leafImage: leafImage || null,
        category: category || null,
        language,
        location: location || null,
        imageQuality: imageQuality || null,
    };
    return `analyze_${crypto.createHash('sha256').update(JSON.stringify(context)).digest('hex')}`;
};
