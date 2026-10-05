import fs from 'node:fs/promises';
import path from 'node:path';
import { evaluateExpertBenchmark } from '../services/expertBenchmarkService.js';

const inputPath = process.argv[2] || path.join(process.env.DIAGNOSIS_DATA_DIR || 'server/dataset', 'expert_benchmark.json');
const raw = await fs.readFile(inputPath, 'utf8');
const cases = JSON.parse(raw);
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), ...evaluateExpertBenchmark(cases) }, null, 2));
