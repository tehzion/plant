import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The review fields must be supplied by a person who actually inspected the image.
// No inference from the reference label or a model prediction is used here.
export function preflightImages(items, { imageDirectory, reviews = {}, inspectImage = inspectWithSips } = {}) {
    const root = realpathSync(imageDirectory);
    const seen = new Map();
    return items.map((item) => {
        const reasons = [];
        let checksum = null;
        let dimensions = null;
        try {
            const path = realpathSync(resolve(root, item.localPath || ''));
            const rel = relative(root, path);
            if (!rel || rel.startsWith('..' + '/') || rel === '..' || isAbsolute(rel)) throw new Error('outside_image_directory');
            const data = readFileSync(path);
            checksum = createHash('sha256').update(data).digest('hex');
            const jpeg = data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
            const png = data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
            if (!jpeg && !png) reasons.push('unsupported_format');
            else {
                try { dimensions = inspectImage(path); } catch { reasons.push('corrupt_or_unreadable'); }
                if (dimensions && (dimensions.width < 128 || dimensions.height < 128)) reasons.push('resolution_too_small');
            }
            if (seen.has(checksum)) reasons.push(`exact_duplicate:${seen.get(checksum)}`);
            else seen.set(checksum, item.imageId);
            if (item.checksum && item.checksum.toLowerCase() !== checksum) reasons.push('checksum_mismatch');
        } catch (error) { reasons.push(error.message === 'outside_image_directory' ? error.message : 'missing_or_unreadable'); }
        const review = reviews[item.imageId];
        if (review?.embeddedLabel === true) reasons.push('embedded_diagnosis_label');
        if (review?.composite === true) reasons.push('multi_image_composite');
        if (review?.unsuitable === true) reasons.push('unsuitable_for_assessment');
        const reviewed = review?.embeddedLabel === false && review?.composite === false && review?.unsuitable === false && Boolean(review?.reviewer);
        return { imageId: item.imageId, localPath: item.localPath, checksum, dimensions,
            status: reasons.length ? 'excluded' : reviewed ? 'accepted' : 'manual_review_required', reasons,
            review: review || null };
    });
}

function inspectWithSips(path) {
    // sips is a macOS image decoder; a successful decode and dimensions are required.
    const result = spawnSync('/usr/bin/sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', path], { encoding: 'utf8', timeout: 10000, maxBuffer: 65536 });
    const width = Number(result.stdout?.match(/pixelWidth:\s*(\d+)/)?.[1]);
    const height = Number(result.stdout?.match(/pixelHeight:\s*(\d+)/)?.[1]);
    if (result.status !== 0 || !width || !height || /Error:/i.test(result.stderr || '')) throw new Error('invalid image');
    return { width, height };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const [manifestPath, reviewPath] = process.argv.slice(2);
    if (!manifestPath) { console.error('Usage: node server/evaluation/imagePreflight.js MANIFEST.json [REVIEWS.json] > audit.json'); process.exit(2); }
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const reviews = reviewPath ? JSON.parse(readFileSync(reviewPath, 'utf8')) : {};
    const results = preflightImages(manifest.selected, { imageDirectory: dirname(resolve(manifestPath)), reviews });
    console.log(JSON.stringify({ manifest: manifestPath, checkedAt: new Date().toISOString(), results }, null, 2));
}
