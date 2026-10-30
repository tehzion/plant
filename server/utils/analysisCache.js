import crypto from 'node:crypto';
import { getFallbackModel, getPrimaryModel } from '../services/aiProvider.js';

// Increment whenever diagnosis prompts or normalization rules change.
export const ANALYSIS_VERSION = '3';

export const buildAnalysisCacheKey = ({ treeImage, image, leafImage, category, language = 'en', location, imageQuality }) => {
    const context = {
        version: ANALYSIS_VERSION,
        model: getPrimaryModel(),
        fallbackModel: getFallbackModel(),
        mainImage: treeImage || image,
        leafImage: leafImage || null,
        category: category || null,
        language,
        location: location || null,
        imageQuality: imageQuality || null,
    };
    return `analyze_${crypto.createHash('sha256').update(JSON.stringify(context)).digest('hex')}`;
};
