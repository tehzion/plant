import { readFile,writeFile,mkdir,readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { summarizeDevelopment,developmentReportMarkdown,compareDevelopmentRuns } from './developmentReport.js';
const [input,output]=process.argv.slice(2);
if(!output) throw Error('Usage: node server/evaluation/reportDevelopmentResults.js ASSESSMENTS.json_OR_RUN_DIR NEW_REPORT_DIR');
let rows;
if(input.endsWith('.json')) rows=JSON.parse(await readFile(input,'utf8'));
else {
    const files=(await readdir(input)).filter(f=>f.endsWith('.result.json')).sort();
    rows=await Promise.all(files.map(async f=>JSON.parse(await readFile(path.join(input,f),'utf8'))));
}
const report=summarizeDevelopment(rows),runs=Object.keys(report.byRun);
const scoringSources=['server/evaluation/developmentReport.js','server/evaluation/datasetLabels.js','server/evaluation/cropNames.js','shared/scanResultPolicy.js'];
const scoringSnapshot=Object.fromEntries(await Promise.all(scoringSources.map(async file=>[file,await readFile(file,'utf8')])));
const scoringMetadata={generatedAt:new Date().toISOString(),input,
    sources:Object.fromEntries(Object.entries(scoringSnapshot).map(([file,text])=>[file,{sha256:createHash('sha256').update(text).digest('hex'),text}]))};
const pairs=runs.slice(1).map(run=>compareDevelopmentRuns(rows,runs[0],run));
await mkdir(output,{mode:0o700});
for(const [file,value] of [['scoring-metadata.json',JSON.stringify(scoringMetadata,null,2)],['report.json',JSON.stringify(report,null,2)],['report.md',developmentReportMarkdown(report)],['paired-comparisons.json',JSON.stringify(pairs,null,2)]]) {
    await writeFile(path.join(output,file),value+'\n',{flag:'wx',mode:0o600});
}
console.log(JSON.stringify({attempted:report.overall.attempted,completed:report.overall.completed,failed:report.overall.failed}));
