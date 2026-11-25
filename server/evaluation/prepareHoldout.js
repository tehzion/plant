import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prepareHoldout, blindReviewPacket } from './holdout.js';

const [inventoryPath, exposurePath, outputDir] = process.argv.slice(2);
if (!outputDir) throw Error('Usage: node server/evaluation/prepareHoldout.js inventory.json exposure.json NEW_OUTPUT_DIR');
const read = async file => JSON.parse(await readFile(file, 'utf8'));
const inventory = await read(inventoryPath);
const split = prepareHoldout(inventory.images || inventory, await read(exposurePath));
// Exclusive directory: a frozen selection cannot be silently overwritten by another run.
await mkdir(outputDir, { mode: 0o700 });
for (const [name, data] of [['split.json', split], ['blind-review.json', blindReviewPacket(split)]]) {
    await writeFile(path.join(outputDir, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
console.log(JSON.stringify({ freezeId: split.freezeId, status: split.status, reserved: split.selected.length,
    development: split.development.length, remaining: split.remaining.length, excluded: split.excluded.length, shortfall: split.shortfall }));
