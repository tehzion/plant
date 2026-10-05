import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateScanQuality } from '../utils/scanQualityEvaluation.js';

const root = process.env.DIAGNOSIS_DATA_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dataset');
const file = process.argv[2] || path.join(root, 'holdout/holdout_verified.json');
const entries = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
if (!Array.isArray(entries)) throw new Error('Expected an array of reviewed scan cases');
console.log(JSON.stringify(evaluateScanQuality(entries, Number(process.env.MIN_VERIFIED_HOLDOUT) || 20), null, 2));
