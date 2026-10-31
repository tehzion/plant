import { createHash } from 'node:crypto';
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export const imageObjectKey = (source, filename) => {
    const folder = source === 'PlantVillage' ? 'plantvillage' : source === 'PlantDoc' ? 'plantdoc' : null;
    if (!folder || !/^[a-f0-9]{64}\.(jpg|jpeg|png)$/.test(filename || '')) throw new Error('Invalid evaluation image reference');
    return `${folder}/${filename}`;
};

export function createEvaluationImageStore(env = process.env, client = null) {
    const bucket = env.EVALUATION_STORAGE_BUCKET;
    if (!bucket || !env.AWS_ENDPOINT_URL_S3 || !env.AWS_REGION || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) throw new Error('Evaluation image storage is not configured');
    const endpoint = new URL(env.AWS_ENDPOINT_URL_S3);
    if (endpoint.protocol !== 'https:') throw new Error('Evaluation storage endpoint must use HTTPS');
    if (env.EVALUATION_STORAGE_BRANCH && !endpoint.hostname.startsWith(`${env.EVALUATION_STORAGE_BRANCH}.storage.`)) throw new Error('Evaluation storage branch does not match the configured branch');
    const s3 = client || new S3Client({ endpoint: endpoint.href, region: env.AWS_REGION, forcePathStyle: true, credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY } });
    return {
        async exists(key) {
            try { await s3.send(new HeadObjectCommand({Bucket:bucket,Key:key})); return true; }
            catch (e) { if (e.name === 'NotFound' || e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) return false; throw e; }
        },
        async put(key, bytes, mime) { await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:bytes,ContentType:mime,Metadata:{sha256:createHash('sha256').update(bytes).digest('hex')}})); },
        async get(key, checksum) {
            const result = await s3.send(new GetObjectCommand({Bucket:bucket,Key:key}));
            if (Number(result.ContentLength) > 6*1024*1024) throw new Error('Evaluation image is too large');
            const bytes = Buffer.from(await result.Body.transformToByteArray());
            if (!bytes.length || bytes.length > 6*1024*1024 || createHash('sha256').update(bytes).digest('hex') !== checksum) throw new Error('Evaluation image checksum mismatch');
            return bytes;
        },
    };
}
