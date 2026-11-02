import { describe, it, expect } from 'vitest';
import { prepareHoldout, blindReviewPacket, applyHoldoutReviews } from './holdout.js';
const checksum = n => n.toString(16).padStart(64, '0');
const image = n => ({ checksum: checksum(n), source: 'PlantVillage', crop: 'tomato', originalLabel: 'rust', leakageGroup: `plant-${n}` });
const exposure = checksums => ({ complete: true, source: 'all attempts', capturedAt: '2026-10-31T00:00:00Z', checksums });
describe('independent holdout', () => {
    it('moves entire related groups into development, even when only one image was attempted', () => {
        const split = prepareHoldout([image(1), { ...image(2), leakageGroup: 'plant-1' }, image(3)], exposure([checksum(1)]));
        expect(split.development).toHaveLength(2); expect(split.selected.map(r => r.checksum)).toEqual([checksum(3)]);
    });
    it('is deterministic regardless of input order and retains all images', () => {
        const images = Array.from({length: 30}, (_,i) => image(i+1));
        const a = prepareHoldout(images, exposure([]), {target: 10});
        const b = prepareHoldout([...images].reverse(), exposure([]), {target: 10});
        expect(a.freezeId).toBe(b.freezeId); expect(a.selected).toEqual(b.selected);
        expect(a.remaining.length + a.selected.length).toBe(30);
    });
    it('fails closed without an exhaustive exposure inventory or with duplicate images', () => {
        expect(() => prepareHoldout([image(1)], { ...exposure([]), complete: false })).toThrow();
        expect(() => prepareHoldout([image(1), image(1)], exposure([]))).toThrow();
    });
    it('does not declare unreviewed or small sets ready', () => {
        const split = prepareHoldout([image(1)], exposure([]));
        expect(split.status).toBe('awaiting_independent_review'); expect(split.shortfall).toBe(99);
        expect(split.selected[0].blockers).toContain('expert_label_review');
    });
    it('withholds an excluded image and its related group', () => {
        const split = prepareHoldout([{...image(1), excluded: true}, {...image(2), leakageGroup:'plant-1'}], exposure([]));
        expect(split.selected).toHaveLength(0); expect(split.excluded).toHaveLength(2);
    });
    it('keeps reference labels and predictions out of the blind review packet', () => {
        const split = prepareHoldout([{...image(1), prediction: {disease:'secret'}, localPath:'tomato/rust.jpg'}], exposure([]));
        const packet = JSON.stringify(blindReviewPacket(split));
        expect(packet).not.toContain('rust'); expect(packet).not.toContain('secret'); expect(packet).not.toContain('tomato');
    });
});

describe('review completion', () => {
    const verified = n => ({...image(n), groupReviewed:true, rightsCleared:true, imageVerified:true, blindImageReviewed:true,
        label:{crop:'tomato', diagnosis:'rust', healthState:'unhealthy', reviewStatus:'expert_verified', reviewedBy:'agronomist-1', reviewedAt:'2026-10-31T00:00:00Z'}});
    it('requires whole-inventory overlap review even if every selected label is verified', () => {
        const split = prepareHoldout([verified(1), image(2)], exposure([]), {target:1});
        expect(split.status).toBe('awaiting_independent_review');
        expect(split.selected[0].blockers).toContain('inventory_overlap_review');
    });
    it('rejects mismatched, incomplete, and duplicate review packets', () => {
        const split = prepareHoldout([image(1)], exposure([]), {target:1});
        const packet = blindReviewPacket(split);
        expect(() => applyHoldoutReviews(split, {...packet, freezeId:'other'})).toThrow();
        expect(() => applyHoldoutReviews(split, {...packet, cases:[]})).toThrow();
        expect(() => applyHoldoutReviews(split, {...packet, cases:[...packet.cases,...packet.cases]})).toThrow();
    });
    it('accepts independently completed reviews and blocks cross-split groups', () => {
        const split = prepareHoldout([verified(1),verified(2)], exposure([]), {target:1});
        const item = split.selected[0];
        const packet = {freezeId:split.freezeId, cases:[{...item, scanId:item.checksum, imageChecksum:item.checksum}]};
        expect(applyHoldoutReviews(split,packet).status).toBe('ready_for_frozen_evaluation');
        packet.cases[0].leakageGroup = split.remaining[0].leakageGroup;
        expect(applyHoldoutReviews(split,packet).selected[0].blockers).toContain('group_overlap_regenerate_split');
    });
});
