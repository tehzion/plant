import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { resolveAiProvider } from '../utils/aiProvider.js';
import { createDecisionShadowService } from '../services/decisionShadowService.js';
import { trackAiUsage } from '../utils/aiUsage.js';
const [splitPath, assessmentsPath, output, approval] = process.argv.slice(2);
if (!output) throw Error('Usage: node server/scripts/tryDecisionShadow.js SPLIT ASSESSMENTS NEW_OUTPUT_DIR');
const config = resolveAiProvider();
if (config.provider !== 'openrouter' || !config.apiKey) throw Error('Existing OpenRouter configuration required');
const split = JSON.parse(await readFile(splitPath,'utf8'));
const records = JSON.parse(await readFile(assessmentsPath,'utf8'));
const allowed = new Map(split.development.map(row=>[row.checksum,row]));
const reserved = new Set(split.selected.map(row=>row.checksum));
// Two label-disagreement examples plus a healthy case from the existing development study.
const checksums = ['c53ad8d40c38debfbc0b79a87d0f3649c20b933a65f5b78a6931f59d06aad498',
    'b1572c5a942ed6485bcf2d41c2b8aaa6d6a42041fc19b0f5e9f212ff8f10210c'];
const healthy = records.find(row=>row.runId==='gpt-5.4-mini:none' && row.prediction?.healthStatus==='healthy');
if (!healthy) throw Error('Missing healthy canary');
checksums.push(healthy.checksum);
const rows = checksums.map(checksum=> {
    const row=records.find(row=>row.checksum===checksum && row.runId==='gpt-5.4-mini:none' && row.completed);
    if (!row || !allowed.has(checksum) || reserved.has(checksum)) throw Error('Canary outside allowed development set');
    return row;
});
if (approval !== '--approve-usd=0.03') {
    console.log(JSON.stringify({status:'dry_run_no_paid_calls',cases:rows.length,budgetUsd:0.03}));
    process.exit(0);
}
await mkdir(output,{mode:0o700});
const sources=['server/services/decisionShadowService.js','server/utils/decisionProtocol.js','server/scripts/tryDecisionShadow.js','shared/scanResultPolicy.js'];
const snapshot=Object.fromEntries(await Promise.all(sources.map(async file=>[file,await readFile(file,'utf8')])));
await writeFile(path.join(output,'source-snapshot.json'),JSON.stringify(snapshot,null,2)+'\n',{flag:'wx',mode:0o600});
const env = { ...process.env, AI_PROVIDER:'openrouter', DECISIONS_SHADOW_ENABLED:'true',
    DECISIONS_SHADOW_MAX_REQUESTS:'3', DECISIONS_SHADOW_MAX_COST_USD:'.03', DECISIONS_SHADOW_TIMEOUT_MS:'5000' };
const check=createDecisionShadowService({env});
const results=[];
for (const row of rows) {
    const item=allowed.get(row.checksum);
    const bytes=await readFile(item.blindImagePath);
    if(createHash('sha256').update(bytes).digest('hex')!==row.checksum) throw Error('Image checksum mismatch');
    const before=JSON.stringify(row.prediction);
    const mime=bytes.subarray(0,3).equals(Buffer.from('ffd8ff','hex'))?'image/jpeg':'image/png';
    const {result,usage}=await trackAiUsage(()=>check({prediction:row.prediction,treeImage:`data:${mime};base64,${bytes.toString('base64')}`,
        crop:row.crop,dataConsent:{aiImprovement:true}}));
    const unchanged=JSON.stringify(row.prediction)===before;
    if (!unchanged) throw Error('Shadow checker changed primary prediction');
    const record={checksum:row.checksum,diagnosisUnchanged:unchanged,metadata:{decisionShadow:result},usage};
    await writeFile(path.join(output,`${row.checksum}.json`),JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});
    results.push(record);
    console.log(JSON.stringify({checksum:row.checksum.slice(0,8),status:result.status,wouldAddReview:result.wouldAddReview,costUsd:result.costUsd,diagnosisUnchanged:unchanged}));
}
await writeFile(path.join(output,'audit.jsonl'),results.map(row=>JSON.stringify(row)).join('\n')+'\n',{flag:'wx',mode:0o600});
await writeFile(path.join(output,'summary.json'),JSON.stringify({cases:results.length,checked:results.filter(r=>r.metadata.decisionShadow.status==='checked').length,
    unchanged:results.every(r=>r.diagnosisUnchanged),costUsd:results.reduce((sum,r)=>sum+(r.metadata.decisionShadow.costUsd || 0),0),reservedImageOverlap:0},null,2)+'\n',{flag:'wx',mode:0o600});
