import { readFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { imageObjectKey } from './imageStore.js';

/** Insert a manifest into the evaluation store, without changing existing entries. */
export async function importReferenceImages({ query, imageRoot, items, imageStore = null }) {
    const root = await realpath(imageRoot);
    const counts = { inserted: 0, skipped: 0, invalid: 0 };
    for (const item of items) {
        const folder = item.source === 'PlantVillage' ? 'plantvillage' : item.source === 'PlantDoc' ? 'plantdoc' : null;
        if (!folder || !/^[a-f0-9]{64}$/.test(item.checksum || '') || !item.originalId || !item.crop || !item.originalLabel || !/^[a-f0-9]{64}\.(?:jpg|jpeg|png)$/.test(item.localPath || '')) { counts.invalid++; continue; }
        try {
            const file = await realpath(path.join(root, folder, item.localPath));
            if (!file.startsWith(root + path.sep)) throw Object.assign(new Error('outside image store'), {code:'INVALID_IMAGE'});
            const data = await readFile(file);
            const validType = data.subarray(0, 3).equals(Buffer.from('ffd8ff','hex')) || data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a','hex'));
            if (!validType || data.length > 6 * 1024 * 1024 || createHash('sha256').update(data).digest('hex') !== item.checksum) throw Object.assign(new Error('invalid image'), {code:'INVALID_IMAGE'});
            let storageKey = null;
            if (imageStore) {
                storageKey = imageObjectKey(item.source,item.localPath);
                if (!(await imageStore.exists(storageKey))) await imageStore.put(storageKey,data,item.localPath.endsWith('.png')?'image/png':'image/jpeg');
                await imageStore.get(storageKey,item.checksum);
            }
            const result = await query('insert into public.agricultural_reference_images(checksum,source,original_id,crop,original_label,filename,metadata,storage_key) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict do nothing returning checksum', [item.checksum,item.source,item.originalId,item.crop,item.originalLabel,item.localPath,{datasetVersion:item.datasetVersion,sourceReference:item.sourceReference,license:item.license,imageVerified:!!item.imageVerified},storageKey]);
            if (result.rows.length) counts.inserted++;
            else {
                if (storageKey) await query('update public.agricultural_reference_images set storage_key=$1 where checksum=$2 and storage_key is null',[storageKey,item.checksum]);
                counts.skipped++;
            }
        } catch (error) {
            if (!['ENOENT','EISDIR','INVALID_IMAGE'].includes(error.code)) throw error;
            counts.invalid++;
        }
    }
    return counts;
}
