import fs from 'node:fs/promises';
import path from 'node:path';
import { evaluateExpertBenchmark } from '../services/expertBenchmarkService.js';

const inputPath = process.argv[2] || path.join(process.env.DIAGNOSIS_DATA_DIR || 'server/dataset', 'expert_benchmark.json');
let cases = [];
try { cases = JSON.parse(await fs.readFile(inputPath, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT' || process.argv[2]) throw error; }
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), ...evaluateExpertBenchmark(cases) }, null, 2));
