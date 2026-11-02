import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const output = process.argv[2];
const host = process.env.EVALUATION_DATABASE_HOST;
const connectionString = process.env.DATABASE_URL?.trim() || (process.env.EVALUATION_DATABASE_URL_FILE
    ? (await readFile(process.env.EVALUATION_DATABASE_URL_FILE, 'utf8')).trim() : '');
if (!output || !host || !connectionString || new URL(connectionString).hostname !== host) {
    throw Error('Output directory and explicit evaluation database host/URL required');
}
const client = new pg.Client({ connectionString, connectionTimeoutMillis: 15000 });
try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL statement_timeout = '15s'");
    const images = await client.query('SELECT checksum, source, crop, original_label, filename, metadata FROM public.agricultural_reference_images ORDER BY checksum');
    // Failures count as exposure: they may already have reached the provider or a developer.
    const attempts = await client.query('SELECT DISTINCT image_checksum FROM public.agricultural_dataset_assessments ORDER BY image_checksum');
    await client.query('COMMIT');
    await mkdir(output, { mode: 0o700 });
    // Known watermark/printed-label cases documented in dataset-status.md.
    const withheld = ['c256a583', '6caf2ad4', 'b21f34ff', '9dd93b42', '3c52144e'];
    const inventory = images.rows.map(r => ({ checksum: r.checksum, source: r.source, crop: r.crop,
        originalLabel: r.original_label, rightsCleared: r.metadata?.rightsCleared === true,
        imageVerified: r.metadata?.imageVerified === true,
        excluded: withheld.some(prefix => r.checksum.startsWith(prefix)),
        blindImagePath: /^[a-f0-9]{64}\.(jpg|png)$/i.test(r.filename)
            ? path.resolve('server/dataset/public-evaluation', r.source.toLowerCase(), r.filename) : null }));
    const exposure = { complete: true, source: 'isolated agricultural_dataset_assessments: all recorded attempts; external/manual exposure still requires review',
        capturedAt: new Date().toISOString(), checksums: attempts.rows.map(r => r.image_checksum) };
    for (const [name, data] of [['inventory.json', {images: inventory}], ['exposure.json', exposure]]) {
        await writeFile(path.join(output, name), JSON.stringify(data, null, 2) + '\n', {flag:'wx', mode:0o600});
    }
    console.log(JSON.stringify({ images: inventory.length, previouslyAttempted: exposure.checksums.length }));
} finally { await client.end(); }
