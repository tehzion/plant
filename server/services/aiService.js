// Facade kept so existing imports of aiService.js keep working.
// The code lives in ./ai/: client, shared helpers, diagnosis, products and farm insights.
export { SCAN_RESULT_STATES } from '../../shared/scanResultPolicy.js';
export * from './ai/shared.js';
export * from './ai/client.js';
export * from './ai/diagnosis.js';
export * from './ai/products.js';
export * from './ai/farmInsights.js';
