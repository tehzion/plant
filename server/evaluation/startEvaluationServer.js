import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import dotenv from 'dotenv';

// Explicit opt-in: the ordinary development and production servers keep their own database.
const envFile = resolve('.env.evaluation.local');
const settings = dotenv.parse(await readFile(envFile, 'utf8'));
if (!settings.DATABASE_URL || !settings.EVALUATION_STORAGE_BRANCH || !settings.AWS_ENDPOINT_URL_S3) throw Error('Evaluation environment is incomplete');
if (!settings.EVALUATION_DATABASE_HOST || new URL(settings.DATABASE_URL).hostname !== settings.EVALUATION_DATABASE_HOST) throw Error('Evaluation database host mismatch');
if (!new URL(settings.AWS_ENDPOINT_URL_S3).hostname.startsWith(`${settings.EVALUATION_STORAGE_BRANCH}.storage.`)) throw Error('Evaluation storage branch mismatch');
Object.assign(process.env,settings,{VERCEL:'1', DIAGNOSIS_DATA_BACKEND:'local', DIAGNOSIS_DATA_DIR:resolve('server/dataset/evaluation-audit')});
const {default:app}=await import('../index.js');
const port=Number(process.env.EVALUATION_PORT || 13004);
if (!Number.isInteger(port) || port<1024 || port>65535) throw Error('Invalid evaluation server port');
app.listen(port,'127.0.0.1',()=>console.log(`Isolated evaluation API listening at http://127.0.0.1:${port}`));
