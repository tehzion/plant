import { readFile } from 'node:fs/promises';
import { summarizeDecisionShadow } from '../utils/decisionShadowMetrics.js';
const input = process.argv[2];
if (!input) throw Error('Usage: node server/scripts/reportDecisionShadow.js PRIVATE_AUDIT.jsonl');
const text = await readFile(input,'utf8');
const records = input.endsWith('.json') ? JSON.parse(text) : text.split('\n').filter(line=>line.trim()).map(line=>JSON.parse(line));
if (!Array.isArray(records)) throw Error('Expected audit records');
console.log(JSON.stringify(summarizeDecisionShadow(records),null,2));
