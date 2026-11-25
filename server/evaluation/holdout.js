import { createHash } from 'node:crypto';

const hash = value => createHash('sha256').update(value).digest('hex');
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

/** Group IDs must come from independent duplicate/plant/farm review, never predictions. */
export function prepareHoldout(images, exposure, { seed = 'independent-v1', target = 100 } = {}) {
    if (!Array.isArray(images) || !Array.isArray(exposure?.checksums) || exposure.complete !== true
        || !exposure.source || !Number.isFinite(Date.parse(exposure.capturedAt))
        || !exposure.checksums.every(sha)) throw Error('Complete, dated exposure inventory required (include failed attempts)');
    if (!Number.isInteger(target) || target < 1 || typeof seed !== 'string' || !seed) throw Error('Invalid holdout settings');
    const used = new Set(exposure.checksums);
    const seen = new Set();
    const groups = new Map();
    for (const item of images) {
        if (!sha(item.checksum)) throw Error('Invalid image checksum');
        if (seen.has(item.checksum)) throw Error('Duplicate checksum in inventory');
        seen.add(item.checksum);
        const group = item.leakageGroup || `unreviewed:${item.checksum}`;
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(item);
    }
    const development = [], candidates = [], excluded = [];
    for (const [group, rows] of groups) {
        if (rows.some(r => used.has(r.checksum))) {
            development.push(...rows.map(r => ({ ...r, splitReason: 'previously_exposed_group' })));
        } else if (rows.some(r => r.excluded === true)) {
            excluded.push(...rows.map(r => ({ ...r, splitReason: 'excluded_group' })));
        } else candidates.push({ group, rows, rank: hash(`${seed}\0${group}`) });
    }
    // Round-robin strata give small crop/condition/source groups a chance before filling large groups.
    const strata = new Map();
    for (const group of candidates.sort((a,b) => a.rank.localeCompare(b.rank))) {
        const key = [...new Set(group.rows.map(r => `${r.source}|${r.crop}|${r.originalLabel}`))].sort().join(';');
        if (!strata.has(key)) strata.set(key, []);
        strata.get(key).push(group);
    }
    const reserved = [], remaining = [];
    while ([...strata.values()].some(s => s.length)) {
        for (const key of [...strata.keys()].sort()) {
            const group = strata.get(key).shift();
            if (!group) continue;
            (reserved.length < target ? reserved : remaining).push(...group.rows);
        }
    }
    const blockers = reviewBlockers;
    const overlapReviewed = images.every(item => item.groupReviewed === true && item.leakageGroup);
    const selected = reserved.map(item => ({ ...item, blockers: [...blockers(item), ...(!overlapReviewed ? ['inventory_overlap_review'] : [])] }));
    const identity = { seed, target, exposure, selected: selected.map(r => ({ checksum: r.checksum, leakageGroup: r.leakageGroup || null })) };
    const freezeId = hash(JSON.stringify(identity));
    return { schemaVersion: 1, freezeId, seed, target, exposure, overlapReviewed,
        status: selected.length >= target && selected.every(r => !r.blockers.length) ? 'ready_for_frozen_evaluation' : 'awaiting_independent_review',
        selected, development, remaining, excluded,
        shortfall: Math.max(0, target - selected.length),
        note: 'Reserved is not proof of independence. Resolve blockers before evaluation; never tune on reserved predictions. Group sizes can exceed the target.' };
}

const reviewBlockers = item => [
        ...(!item.leakageGroup || item.groupReviewed !== true ? ['duplicate_plant_farm_review'] : []),
        ...(item.rightsCleared !== true ? ['rights_review'] : []),
        ...(item.imageVerified !== true || item.blindImageReviewed !== true ? ['image_and_embedded_label_review'] : []),
        ...(item.label?.reviewStatus !== 'expert_verified' || !item.label.reviewedBy?.trim()
            || item.label.reviewedBy.trim().toLowerCase() === 'unknown'
            || !Number.isFinite(Date.parse(item.label.reviewedAt)) || !item.label.crop?.trim()
            || !item.label.diagnosis?.trim() || !['healthy','unhealthy'].includes(item.label.healthState)
            ? ['expert_label_review'] : [])
    ];
// Neutral identifiers and paths: no reference diagnoses, crops, or model outputs in the blind packet.
export function blindReviewPacket(split) {
    return { freezeId: split.freezeId, instructions: 'Inspect the image without dataset labels or model predictions. Record your own diagnosis; leave uncertain cases pending. Review related photos before assigning leakageGroup.',
        cases: split.selected.map(item => ({ scanId: item.checksum, imageChecksum: item.checksum,
            imagePath: item.blindImagePath || null, leakageGroup: null, groupReviewed: false,
            rightsCleared: false, blindImageReviewed: false,
            label: { crop: '', diagnosis: '', healthState: '', approvedAliases: [], reviewStatus: 'pending', reviewedBy: '', reviewedAt: '' }, notes: '' })) };
}

/** Attach human reviews without changing the reserved membership. */
export function applyHoldoutReviews(split, packet) {
    if (packet.freezeId !== split.freezeId || !Array.isArray(packet.cases)) throw Error('Review freeze mismatch');
    const expected = new Set(split.selected.map(r => r.checksum));
    const reviews = new Map();
    for (const review of packet.cases) {
        if (!expected.has(review.imageChecksum) || review.scanId !== review.imageChecksum || reviews.has(review.imageChecksum)) throw Error('Unknown or duplicate review');
        reviews.set(review.imageChecksum, review);
    }
    if (reviews.size !== expected.size) throw Error('Review packet is incomplete');
    const otherGroups = new Set([...split.development, ...split.remaining, ...split.excluded].map(r => r.leakageGroup).filter(Boolean));
    const selected = split.selected.map(item => {
        const review = reviews.get(item.checksum);
        const merged = { ...item, leakageGroup: review.leakageGroup, groupReviewed: review.groupReviewed,
            rightsCleared: review.rightsCleared, blindImageReviewed: review.blindImageReviewed, label: review.label };
        merged.blockers = reviewBlockers(merged);
        if (!split.overlapReviewed) merged.blockers.push('inventory_overlap_review');
        if (merged.leakageGroup && otherGroups.has(merged.leakageGroup)) merged.blockers.push('group_overlap_regenerate_split');
        return merged;
    });
    return { ...split, selected, reviewRevision: hash(JSON.stringify(packet)),
        status: !split.shortfall && selected.every(r => !r.blockers.length) ? 'ready_for_frozen_evaluation' : 'awaiting_independent_review' };
}
