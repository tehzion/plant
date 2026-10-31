import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { summarizeDevelopment, developmentReportMarkdown } from './developmentReport.js';
const [splitPath, output] = process.argv.slice(2);
if (!output) throw Error('Usage: node --env-file=.env.evaluation.local server/evaluation/exportDevelopmentResults.js SPLIT NEW_OUTPUT_DIR');
const split = JSON.parse(await readFile(splitPath,'utf8'));
const allowed = split.development.map(r=>r.checksum);
if (!allowed.length || allowed.some(c=>split.selected.some(r=>r.checksum===c))) throw Error('Invalid development/holdout separation');
const host = process.env.EVALUATION_DATABASE_HOST;
const connectionString = process.env.DATABASE_URL?.trim() || (await readFile(process.env.EVALUATION_DATABASE_URL_FILE,'utf8')).trim();
if (!host || new URL(connectionString).hostname !== host) throw Error('Explicit isolated database host required');
const client = new pg.Client({connectionString,connectionTimeoutMillis:15000});
let rows;
try {
    await client.connect(); await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL statement_timeout = '15s'");
    const result = await client.query(`SELECT a.*, i.source, i.crop, i.original_label FROM public.agricultural_dataset_assessments a
        JOIN public.agricultural_reference_images i ON i.checksum=a.image_checksum WHERE a.image_checksum=ANY($1::text[]) ORDER BY a.run_id,a.image_checksum`,[allowed]);
    rows = result.rows.map(r=>({checksum:r.image_checksum,runId:r.run_id,source:r.source,crop:r.crop,originalLabel:r.original_label,
        completed:r.completed,durationMs:r.duration_ms,evaluatedAt:r.evaluated_at,
        prediction:Object.fromEntries(Object.entries(r.response || {}).filter(([k])=>k!=='feedbackToken'))}));
    await client.query('COMMIT');
} finally {await client.end();}
const report = summarizeDevelopment(rows);
await mkdir(output,{mode:0o700});
for (const [file,value] of [['assessments.json',JSON.stringify(rows,null,2)],['report.json',JSON.stringify(report,null,2)],['report.md',developmentReportMarkdown(report)]]) {
    await writeFile(path.join(output,file),value+'\n',{flag:'wx',mode:0o600});
}
console.log(JSON.stringify({records:rows.length,images:new Set(rows.map(r=>r.checksum)).size,completed:report.overall.completed,failed:report.overall.failed}));
