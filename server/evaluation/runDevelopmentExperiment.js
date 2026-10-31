import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { planDevelopmentExperiment, buildReferenceContent, ExperimentBudget } from './developmentExperiments.js';
import { summarizeDevelopment, developmentReportMarkdown, compareDevelopmentRuns } from './developmentReport.js';
import { farmerCategory } from './datasetLabels.js';
import { buildDiagnosisStagePrompt, createModelMessagesWithImages, mergeDiagnosisResult, assessSpeciesIdentification, buildSpeciesContext } from '../services/aiService.js';
import { validateDiagnosisStage } from '../utils/diagnosisValidation.js';
import { resolveAiProvider } from '../utils/aiProvider.js';

const [splitPath,indexPath,output,...flags]=process.argv.slice(2);
if(!output) throw Error('Usage: node server/evaluation/runDevelopmentExperiment.js SPLIT INDEX NEW_OUTPUT_DIR [--approve-usd=3]');
const read=async file=>JSON.parse(await readFile(file,'utf8'));
const split=await read(splitPath),index=await read(indexPath);
const plan=planDevelopmentExperiment(split,index);
await mkdir(output,{mode:0o700});
const save=async(name,data)=>writeFile(path.join(output,name),JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});
await save('plan.json',plan);
const approval=flags.find(f=>f.startsWith('--approve-usd='));
if(!approval) { console.log(JSON.stringify({planId:plan.planId,images:plan.cases.length,variants:plan.variants.length,requests:plan.cases.length*plan.variants.length,status:'dry_run_no_paid_calls'})); process.exit(0); }
const budget=new ExperimentBudget(Number(approval.split('=')[1]));
const config=resolveAiProvider();
if(config.provider!=='openrouter' || !config.apiKey) throw Error('Existing OpenRouter configuration required');
const headers={Authorization:`Bearer ${config.apiKey}`,'Content-Type':'application/json'};
const accountUsage=async()=>{
    const response=await fetch('https://openrouter.ai/api/v1/key',{headers,signal:AbortSignal.timeout(15000)});
    if(!response.ok) throw Error('Cannot verify provider usage');
    const usage=(await response.json()).data?.usage;
    if(!Number.isFinite(usage)) throw Error('Missing provider usage');
    return usage;
};
const modelsResponse=await fetch('https://openrouter.ai/api/v1/models',{signal:AbortSignal.timeout(15000)});
if(!modelsResponse.ok) throw Error('Cannot verify model availability and pricing');
const catalog=(await modelsResponse.json()).data;
const modelInfo=plan.variants.filter(v=>!v.retrieval).map(v=>catalog.find(m=>m.id===v.model));
if(modelInfo.some(m=>!m || !m.architecture?.input_modalities?.includes('image') || Number(m.pricing.prompt)>0.000001 || Number(m.pricing.completion)>0.000005)) throw Error('Model availability or pricing changed; inspect before running');
const initialUsage=await accountUsage();
const sourceFiles=['server/services/aiService.js','shared/scanResultPolicy.js','server/evaluation/developmentExperiments.js','server/evaluation/visualRetrieval.js','server/evaluation/runDevelopmentExperiment.js','server/evaluation/cropNames.js','server/evaluation/datasetLabels.js','server/evaluation/developmentReport.js','server/utils/diagnosisValidation.js'];
const sourceSnapshot=Object.fromEntries(await Promise.all(sourceFiles.map(async f=>[f,await readFile(f,'utf8')])));
await save('source-snapshot.json',sourceSnapshot);
const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')])));
await save('run-metadata.json',{planId:plan.planId,startedAt:new Date().toISOString(),approvedUsd:budget.limitUsd,initialUsage,sourceHashes,
    models:modelInfo.map(m=>({id:m.id,pricing:m.pricing})),settings:{language:'en',cropInput:'farmer-stated reference crop',maxTokens:2600,retries:0,treatmentEnrichment:false},
    limits:'Exploratory diagnosis stage only, not full API; no training or production changes. Budget checks are conservative software stops, not provider-enforced billing limits.'});
const imageUrl=async item=>{
    const bytes=await readFile(item.blindImagePath);
    if(bytes.length>5*1024*1024 || createHash('sha256').update(bytes).digest('hex')!==item.checksum) throw Error('Image checksum/size mismatch');
    const mime=bytes.subarray(0,3).equals(Buffer.from('ffd8ff','hex'))?'image/jpeg':bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))?'image/png':null;
    if(!mime) throw Error('Unsupported image');
    return `data:${mime};base64,${bytes.toString('base64')}`;
};
const rows=[];let stopped=null,sequence=0;
outer:for(const c of plan.cases) {
    const category=farmerCategory(c.query.crop),language='en',userLocation='Malaysia';
    const speciesAssessment=assessSpeciesIdentification(null,category);
    const speciesContext=buildSpeciesContext({speciesAssessment,category,source:'User category'});
    const args={plantNetResult:null,speciesAssessment,speciesContext,category,language,userLocation,malaysiaCropInfo:null,leafImage:null,imageQuality:null};
    const prompt=buildDiagnosisStagePrompt(args)+`\nFarmer-stated crop: ${JSON.stringify(c.query.crop)}. This is context, not visual proof. Diagnose the query image independently.`;
    const queryUrl=await imageUrl(c.query),referenceUrls=await Promise.all(c.references.map(imageUrl));
    // Counterbalance baseline/retrieval and model order across images.
    const variants=sequence%2?[...plan.variants].reverse():plan.variants;sequence++;
    for(const variant of variants) {
        const key=createHash('sha256').update(`${plan.planId}:${variant.id}:${c.query.checksum}`).digest('hex');
        const messages=createModelMessagesWithImages(prompt,queryUrl,null,speciesContext);
        if(variant.retrieval) messages[messages.length-1].content.push(...buildReferenceContent(c.references,referenceUrls));
        const request={model:variant.model,messages,response_format:{type:'json_object'},max_tokens:2600,usage:{include:true}};
        const observed=Math.max(0,(await accountUsage())-initialUsage);
        if(!budget.reserve(observed)) {stopped='budget_reserve';break outer;}
        // An interrupted request has a durable start record and is never retried automatically.
        await save(`${key}.started.json`,{checksum:c.query.checksum,variant:variant.id,startedAt:new Date().toISOString(),promptHash:createHash('sha256').update(JSON.stringify(messages)).digest('hex')});
        const start=Date.now();let prediction,completed=false,costUsd=null,fatal=false;
        try {
            const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers,body:JSON.stringify(request),signal:AbortSignal.timeout(120000)});
            const data=await response.json();
            costUsd=typeof data.usage?.cost==='number'?data.usage.cost:null;
            await save(`${key}.provider.json`,{id:data.id,model:data.model,usage:data.usage,choices:data.choices,error:data.error,httpStatus:response.status});
            if(!response.ok) throw Error(`Provider HTTP ${response.status}: ${data.error?.message || 'request failed'}`);
            const raw=data.choices?.[0]?.message?.content || '';
            const stage=JSON.parse(raw.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));
            const issues=validateDiagnosisStage(stage);
            if(issues.some(i=>['missing_diagnosis','missing_capture_assessment','missing_diagnosis_label'].includes(i))) throw Error(`Invalid stage: ${issues.join(',')}`);
            prediction=mergeDiagnosisResult({...args,stageOne:stage,stageTwo:null});
            prediction.analysisMetadata={provider:'openrouter',model:data.model || variant.model,policyVersion:4,diagnosisAttempts:1,experimentPlan:plan.planId};
            completed=true;
        } catch(error) {prediction={error:String(error.message).slice(0,500)};}
        try {budget.settle(costUsd);} catch(error) {fatal=true;stopped=error.message;}
        const row={checksum:c.query.checksum,runId:variant.id,source:c.query.source,crop:c.query.crop,originalLabel:c.query.originalLabel,
            completed,prediction,costUsd,durationMs:Date.now()-start,references:variant.retrieval?c.references.map(r=>r.checksum):[]};
        await save(`${key}.result.json`,row);rows.push(row);
        console.log(JSON.stringify({image:rows.length,variant:variant.id,completed,disease:prediction.disease,costUsd,spentUsd:budget.spentUsd}));
        if(fatal) break outer;
    }
}
const report=summarizeDevelopment(rows);
await save('assessments.json',rows);await save('report.json',report);
const comparisons=plan.variants.slice(1).map(v=>compareDevelopmentRuns(rows,plan.variants[0].id,v.id));
await save('paired-comparisons.json',comparisons);
await writeFile(path.join(output,'report.md'),developmentReportMarkdown(report),{flag:'wx',mode:0o600});
await save('completion.json',{completedAt:new Date().toISOString(),stopped,requested:plan.cases.length*plan.variants.length,recorded:rows.length,
    chargedCostUsd:rows.reduce((sum,r)=>sum+(r.costUsd || 0),0),providerUsageDeltaUsd:(await accountUsage())-initialUsage});
