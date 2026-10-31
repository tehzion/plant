import { createHash } from 'node:crypto';

const CATEGORIES = new Set(['healthy', 'plantvillage_diseased', 'plantdoc_diseased', 'difficult']);
const REQUIRED = ['imageId', 'source', 'originalId', 'crop', 'originalLabel', 'normalizedLabel', 'category', 'license', 'sourceReference', 'checksum', 'datasetVersion'];
const norm = (value) => String(value ?? '').trim();

/** Select only independently reviewed, rights-cleared candidates. No images are downloaded here. */
export function prepareManifest(candidates, { seed, targets = { healthy: 20, plantvillage_diseased: 40, plantdoc_diseased: 30, difficult: 10 } } = {}) {
    if (!Array.isArray(candidates) || !Number.isSafeInteger(seed)) throw new TypeError('Candidates and an integer seed are required');
    const ids = new Set();
    const hashes = new Set();
    const accepted = [];
    const rejected = [];
    for (const item of candidates) {
        const reasons = REQUIRED.filter((key) => !norm(item[key])).map((key) => `missing:${key}`);
        if (!CATEGORIES.has(item.category)) reasons.push('invalid_category');
        if (!['PlantVillage', 'PlantDoc'].includes(item.source)) reasons.push('invalid_source');
        if (item.rightsCleared !== true || item.imageVerified !== true) reasons.push('not_cleared_or_verified');
        if (!/^[a-f0-9]{64}$/i.test(norm(item.checksum))) reasons.push('invalid_sha256');
        if (item.category === 'plantvillage_diseased' && item.source !== 'PlantVillage') reasons.push('source_category_mismatch');
        if (item.category === 'plantdoc_diseased' && item.source !== 'PlantDoc') reasons.push('source_category_mismatch');
        if (ids.has(item.imageId)) reasons.push('duplicate_id');
        if (hashes.has(norm(item.checksum).toLowerCase())) reasons.push('duplicate_checksum');
        if (reasons.length) { rejected.push({ imageId: item.imageId ?? null, reasons }); continue; }
        ids.add(item.imageId); hashes.add(norm(item.checksum).toLowerCase());
        accepted.push({ ...item, checksum: item.checksum.toLowerCase(), samplingSeed: seed });
    }
    const rank = (item) => createHash('sha256').update(`${seed}\0${item.source}\0${item.originalId}\0${item.checksum}`).digest('hex');
    const selected = [];
    for (const category of CATEGORIES) {
        const count = targets[category] ?? 0;
        if (!Number.isSafeInteger(count) || count < 0) throw new TypeError(`Invalid target for ${category}`);
        selected.push(...accepted.filter((item) => item.category === category).sort((a, b) => rank(a).localeCompare(rank(b)) || a.imageId.localeCompare(b.imageId)).slice(0, count));
    }
    return { seed, targets, selected, rejected, shortfalls: Object.fromEntries([...CATEGORIES].map((category) => [category, Math.max(0, (targets[category] ?? 0) - selected.filter((item) => item.category === category).length)])) };
}
