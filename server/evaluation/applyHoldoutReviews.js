import { readFile, writeFile } from 'node:fs/promises';
import { applyHoldoutReviews } from './holdout.js';
const [splitPath, reviewsPath, outputPath] = process.argv.slice(2);
if (!outputPath) throw Error('Usage: node server/evaluation/applyHoldoutReviews.js split.json completed-blind-review.json NEW_OUTPUT.json');
const read = async file => JSON.parse(await readFile(file, 'utf8'));
const result = applyHoldoutReviews(await read(splitPath), await read(reviewsPath));
await writeFile(outputPath, JSON.stringify(result, null, 2) + '\n', {flag:'wx', mode:0o600});
console.log(JSON.stringify({ status: result.status, reviewedCases: result.selected.filter(r => !r.blockers.length).length, reserved: result.selected.length }));
