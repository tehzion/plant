import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { preflightImages } from './imagePreflight.js';

describe('dataset image preflight', () => {
    it('audits duplicates, unsupported and corrupt files, and requires human review', () => {
        const dir = mkdtempSync(join(tmpdir(), 'image-preflight-'));
        try {
            const jpg = Buffer.from([255,216,255,1,2,3]);
            writeFileSync(join(dir, 'a.jpg'), jpg); writeFileSync(join(dir, 'b.jpg'), jpg);
            writeFileSync(join(dir, 'invalid.jpg'), 'not an image');
            writeFileSync(join(dir, 'corrupt.jpg'), Buffer.from([255,216,255,4]));
            const inspectImage = (path) => { if (path.endsWith('corrupt.jpg')) throw Error('corrupt'); return { width: 300, height: 300 }; };
            const items = ['a.jpg','b.jpg','invalid.jpg','corrupt.jpg','missing.jpg'].map((localPath, i) => ({ imageId: String(i), localPath }));
            const out = preflightImages(items, { imageDirectory: dir, inspectImage });
            expect(out[0].status).toBe('manual_review_required');
            expect(out[1].reasons).toContain('exact_duplicate:0');
            expect(out[2].reasons).toContain('unsupported_format');
            expect(out[3].reasons).toContain('corrupt_or_unreadable');
            expect(out[4].reasons).toContain('missing_or_unreadable');
            const reviewed = preflightImages(items.slice(0, 1), { imageDirectory: dir, inspectImage, reviews: { '0': { reviewer: 'reviewer', embeddedLabel: false, composite: false, unsuitable: false } } });
            expect(reviewed[0].status).toBe('accepted');
            const excluded = preflightImages(items.slice(0, 1), { imageDirectory: dir, inspectImage, reviews: { '0': { reviewer: 'reviewer', embeddedLabel: true } } });
            expect(excluded[0].reasons).toContain('embedded_diagnosis_label');
        } finally { rmSync(dir, { recursive: true, force: true }); }
    });
});
