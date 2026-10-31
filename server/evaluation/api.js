import { queryEvaluation } from './database.js';
import { open as openFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { calculateMetrics, calculateCropMetrics } from './metrics.js';
import { buildEvaluationReport } from './report.js';
import { verifyAdminRequest } from '../services/adminAnalyticsService.js';
import { createEvaluationImageStore, imageObjectKey } from './imageStore.js';

const error = (message, status = 400) => Object.assign(new Error(message), { status });
const bounded = (value, max = 2000) => {
    if (value == null) return '';
    if (typeof value !== 'string' || value.length > max) throw error('Invalid text field');
    return value.trim();
};
const caseKey = (value) => {
    if (!/^[a-f0-9]{64}$/.test(String(value || ''))) throw error('Invalid case ID');
    return value;
};
export function validateImportedCase(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw error('Invalid case');
    const key = caseKey(input.key);
    const imageId = bounded(input.imageId, 200), workflow = bounded(input.workflowVersion, 200);
    if (!imageId || !workflow || !['PlantVillage','PlantDoc'].includes(input.source) || !input.reference || !input.prediction) throw error('Missing case fields');
    const p = input.provenance;
    if (!p || p.rightsCleared !== true || p.imageVerified !== true || !bounded(p.originalId,500) || !bounded(p.license,500) || !bounded(p.sourceReference,1000) || !bounded(p.datasetVersion,200) || !/^[a-f0-9]{64}$/.test(String(p.checksum || '')) || !Number.isSafeInteger(p.samplingSeed)) throw error('Complete rights-cleared provenance is required');
    if (JSON.stringify(input).length > 200000) throw error('Case exceeds size limit');
    // Images and capability tokens do not belong in the database record.
    const serialized = JSON.stringify(input);
    if (/data:image\/|feedbackToken/i.test(serialized)) throw error('Image data or capability token is not allowed');
    if (typeof input.reference !== 'object' || typeof input.prediction !== 'object' || typeof input.prediction.completed !== 'boolean') throw error('Invalid reference or prediction');
    return { key, imageId, workflow, source: input.source, record: input };
}
export function validateReview(input) {
    if (!['agree','disagree','inconclusive','requires_evidence'].includes(input?.verdict)) throw error('Choose a review verdict');
    const correctedCondition = bounded(input.correctedCondition, 200);
    if (input.verdict === 'disagree' && !correctedCondition) throw error('A corrected condition is required for disagreement');
    return { verdict: input.verdict, correctedCondition, uncertainty: bounded(input.uncertainty, 500), followUp: bounded(input.followUp, 1000), comments: bounded(input.comments, 2000) };
}
export function validateUsability(input) {
    if (input?.consent !== true || typeof input.completed !== 'boolean' || typeof input.assistance !== 'boolean') throw error('Consent, completion and assistance are required');
    const participantId = bounded(input.participantId, 80);
    if (!/^[a-zA-Z0-9_-]{3,80}$/.test(participantId)) throw error('Use an anonymous participant ID');
    if (!['assessment','assistant','product','farm_activity'].includes(input.task)) throw error('Invalid task');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.testDate || '') || Number.isNaN(Date.parse(input.testDate)) || new Date(input.testDate).toISOString().slice(0,10) !== input.testDate) throw error('Invalid date');
    const duration = input.durationSeconds == null || input.durationSeconds === '' ? null : Number(input.durationSeconds);
    if (duration !== null && (!Number.isInteger(duration) || duration < 0 || duration > 86400)) throw error('Invalid duration');
    return { participantId, task:input.task, testDate:input.testDate, completed:input.completed, assistance:input.assistance, duration, difficulty:bounded(input.difficulty,500), feedback:bounded(input.feedback), observations:bounded(input.observations) };
}
export function registerEvaluationRoutes(app, { query = queryEvaluation, authorize = verifyAdminRequest } = {}) {
    const route = (method, url, handler) => app[method](url, async (req,res,next) => {
        try { const user = await authorize(req); await handler(req,res,user); } catch (e) { next(e); }
    });
    route('get','/api/admin/evaluation/dataset', async(req,res) => {
        const limit = Math.floor(Math.min(Math.max(Number(req.query.limit) || 20, 1), 100));
        const offset = Math.floor(Math.min(Math.max(Number(req.query.offset) || 0, 0), 100000));
        const source = req.query.source || null;
        if (source && !['PlantVillage','PlantDoc'].includes(source)) throw error('Invalid dataset');
        const summary = await query(`select count(*)::int as total,
            coalesce(array_agg(distinct source) filter (where source is not null),'{}') as sources,
            coalesce(array_agg(distinct crop) filter (where crop is not null),'{}') as crops,
            coalesce(array_agg(distinct original_label) filter (where original_label is not null),'{}') as conditions
            from public.agricultural_reference_images`);
        const metrics = await query(`with latest as (
            select distinct on (image_checksum) agreement from public.agricultural_dataset_assessments
            order by image_checksum, evaluated_at desc nulls last
        ) select (select count(*)::int from public.agricultural_dataset_assessments where completed) as completed,
            count(*) filter (where agreement='match')::int as matches,
            count(*) filter (where agreement in ('match','different_or_unclear'))::int as comparable from latest`);
        const rows = await query(`select i.checksum,i.source,i.crop,i.original_label,a.predicted_crop,a.predicted_condition,a.agreement,a.completed,a.run_id,a.evaluated_at
            from public.agricultural_reference_images i left join lateral
            (select * from public.agricultural_dataset_assessments where image_checksum=i.checksum order by evaluated_at desc nulls last limit 1) a on true
            where ($1::text is null or i.source=$1) order by i.source,i.crop,i.checksum limit $2 offset $3`, [source,limit,offset]);
        res.json({summary:summary.rows[0], metrics:metrics.rows[0], images:rows.rows, limit, offset});
    });
    route('get','/api/admin/evaluation/dataset/:checksum/image', async(req,res) => {
        const checksum=caseKey(req.params.checksum);
        const found=await query('select source,filename,storage_key from public.agricultural_reference_images where checksum=$1',[checksum]);
        if (!found.rows.length) throw error('Evaluation image unavailable',404);
        const {source,filename,storage_key}=found.rows[0];
        const folder=source === 'PlantVillage' ? 'plantvillage' : source === 'PlantDoc' ? 'plantdoc' : null;
        if (!folder || !new RegExp(`^${checksum}\\.(jpg|jpeg|png)$`).test(filename)) throw error('Evaluation image unavailable',404);
        if (storage_key) {
            if (storage_key !== imageObjectKey(source,filename)) throw error('Invalid evaluation image reference',400);
            const bytes=await createEvaluationImageStore().get(storage_key,checksum);
            const jpeg=bytes.subarray(0,3).equals(Buffer.from('ffd8ff','hex'));
            const png=bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
            if (!jpeg && !png) throw error('Invalid image format',400);
            res.set('Cache-Control','private, no-store'); res.type(jpeg ? 'image/jpeg' : 'image/png'); return res.send(bytes);
        }
        if (!process.env.EVALUATION_IMAGE_DIR) throw error('Evaluation image unavailable',404);
        let file;
        try {
            file=await openFile(path.join(process.env.EVALUATION_IMAGE_DIR,folder,filename),constants.O_RDONLY | constants.O_NOFOLLOW);
            const stat=await file.stat();
            if (!stat.isFile() || stat.size < 1 || stat.size > 6 * 1024 * 1024) throw error('Invalid image',400);
            const bytes=await file.readFile();
            if (createHash('sha256').update(bytes).digest('hex') !== checksum) throw error('Image checksum mismatch',400);
            const jpeg=bytes.subarray(0,3).equals(Buffer.from('ffd8ff','hex'));
            const png=bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
            if (!jpeg && !png) throw error('Invalid image format',400);
            res.set('Cache-Control','private, no-store'); res.type(jpeg ? 'image/jpeg' : 'image/png'); res.send(bytes);
        } catch (e) { if (e.code === 'ENOENT') throw error('Evaluation image unavailable',404); throw e; }
        finally { await file?.close(); }
    });
    route('post','/api/admin/evaluation/cases', async(req,res,user) => {
        const c = validateImportedCase(req.body);
        const result = await query('insert into public.evaluation_cases (id,image_id,source,workflow_version,record,imported_by) values ($1,$2,$3,$4,$5,$6) on conflict (id) do nothing returning id', [c.key,c.imageId,c.source,c.workflow,c.record,user.id]);
        if (!result.rows.length) throw error('Case already exists; original record was preserved',409);
        res.status(201).json({ id:c.key });
    });
    route('get','/api/admin/evaluation/cases', async(req,res) => {
        const limit = Math.floor(Math.min(Math.max(Number(req.query.limit) || 25,1),100)), offset = Math.floor(Math.min(Math.max(Number(req.query.offset) || 0,0),100000));
        const source = req.query.source || null;
        if (source && !['PlantVillage','PlantDoc'].includes(source)) throw error('Invalid dataset');
        const {rows} = await query('select id, record, created_at from public.evaluation_cases where ($1::text is null or source = $1) order by created_at desc,id desc limit $2 offset $3', [source,limit,offset]);
        res.json({cases:rows, limit, offset});
    });
    route('get','/api/admin/evaluation/cases/:id', async(req,res) => {
        const id=caseKey(req.params.id);
        const found=await query('select id, record, created_at from public.evaluation_cases where id=$1',[id]);
        if (!found.rows.length) throw error('Case not found',404);
        const reviews=await query('select id,reviewer_id,verdict,corrected_condition,uncertainty,follow_up,comments,created_at from public.evaluation_reviews where case_id=$1 order by created_at desc',[id]);
        res.json({case:found.rows[0], reviews:reviews.rows});
    });
    route('get','/api/admin/evaluation/cases/:id/image', async(req,res) => {
        const id=caseKey(req.params.id);
        const result=await query('select source,record from public.evaluation_cases where id=$1',[id]);
        if (!result.rows.length) throw error('Case not found',404);
        const {source,record}=result.rows[0], checksum=record?.provenance?.checksum;
        if (!process.env.EVALUATION_IMAGE_DIR || !/^[a-f0-9]{64}$/.test(String(checksum || '')) || record?.provenance?.rightsCleared !== true) throw error('Evaluation image unavailable',404);
        const folder=source === 'PlantVillage' ? 'plantvillage' : source === 'PlantDoc' ? 'plantdoc' : null;
        if (!folder) throw error('Evaluation image unavailable',404);
        let bytes=null;
        for (const extension of ['.jpg','.jpeg','.png']) {
            let file;
            try {
                file=await openFile(path.join(process.env.EVALUATION_IMAGE_DIR,folder,`${checksum}${extension}`),constants.O_RDONLY | constants.O_NOFOLLOW);
                const stat=await file.stat();
                if (!stat.isFile() || stat.size < 1 || stat.size > 6 * 1024 * 1024) throw error('Invalid image',400);
                bytes=Buffer.alloc(stat.size);
                const {bytesRead}=await file.read(bytes,0,stat.size,0);
                if (bytesRead !== stat.size) throw error('Incomplete image',400);
                if (createHash('sha256').update(bytes).digest('hex') !== checksum) throw error('Image checksum mismatch',400);
                break;
            } catch (e) { if (e.code !== 'ENOENT') throw e; } finally { await file?.close(); }
        }
        if (!bytes) throw error('Evaluation image unavailable',404);
        const jpeg=bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff;
        const png=bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
        if (!jpeg && !png) throw error('Invalid image format',400);
        res.set('Cache-Control','private, no-store'); res.type(jpeg ? 'image/jpeg' : 'image/png'); res.send(bytes);
    });
    route('post','/api/admin/evaluation/cases/:id/reviews', async(req,res,user) => {
        const id=caseKey(req.params.id), v=validateReview(req.body);
        const result=await query('insert into public.evaluation_reviews (case_id,reviewer_id,verdict,corrected_condition,uncertainty,follow_up,comments) select id,$2,$3,$4,$5,$6,$7 from public.evaluation_cases where id=$1 returning id,created_at',[id,user.id,v.verdict,v.correctedCondition,v.uncertainty,v.followUp,v.comments]);
        if (!result.rows.length) throw error('Case not found',404);
        res.status(201).json({review:result.rows[0]});
    });
    route('post','/api/admin/evaluation/usability', async(req,res,user) => {
        const v=validateUsability(req.body);
        const result=await query('insert into public.evaluation_usability_sessions(participant_id,consent,test_date,task,completed,duration_seconds,assistance,difficulty,feedback,observations,recorded_by) values ($1,true,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id,created_at',[v.participantId,v.testDate,v.task,v.completed,v.duration,v.assistance,v.difficulty,v.feedback,v.observations,user.id]);
        res.status(201).json({session:result.rows[0]});
    });
    route('post','/api/admin/evaluation/product-scenarios', async(req,res,user) => {
        const scenario=req.body?.scenario, recommendation=req.body?.recommendation;
        if (!scenario || typeof scenario !== 'object' || Array.isArray(scenario) || !recommendation || typeof recommendation !== 'object' || Array.isArray(recommendation)) throw error('Scenario and catalogue response are required');
        if (!bounded(scenario.plantType,200) || !bounded(scenario.disease,200) || JSON.stringify(req.body).length > 150000) throw error('Invalid scenario or response');
        const result=await query('insert into public.evaluation_product_scenarios(scenario,recommendation,recorded_by) values ($1,$2,$3) returning id,created_at',[scenario,recommendation,user.id]);
        res.status(201).json({scenario:result.rows[0]});
    });
    route('get','/api/admin/evaluation/product-scenarios', async(req,res) => {
        const result=await query('select id,scenario,recommendation,recorded_by,created_at from public.evaluation_product_scenarios order by created_at desc,id desc limit 50');
        res.json({scenarios:result.rows});
    });
    route('get','/api/admin/evaluation/product-scenarios/:id/reviews', async(req,res) => {
        const id=String(req.params.id || '');
        if (!/^[a-f0-9-]{36}$/i.test(id)) throw error('Invalid scenario ID');
        const result=await query('select id,reviewer_id,product_id,verdict,crop_compatibility,product_purpose,condition_relevance,label_information,restrictions,missing_information,unsupported_claims,uncertainty,comments,created_at from public.evaluation_product_reviews where scenario_id=$1 order by created_at desc',[id]);
        res.json({reviews:result.rows});
    });
    route('post','/api/admin/evaluation/product-scenarios/:id/reviews', async(req,res,user) => {
        const id=String(req.params.id || ''), body=req.body || {};
        if (!/^[a-f0-9-]{36}$/i.test(id) || !['suitable','unsuitable','requires_verification'].includes(body.verdict) || !bounded(body.productId,200)) throw error('Invalid product review');
        const found=await query('select recommendation from public.evaluation_product_scenarios where id=$1',[id]);
        if (!found.rows.length) throw error('Scenario not found',404);
        const catalog=found.rows[0].recommendation || {};
        const products=['diseaseControl','fertilizers','supplements','catalogueDiscovery'].flatMap(group=>Array.isArray(catalog[group]) ? catalog[group] : []);
        if (!products.some(product=>String(product?.id) === body.productId)) throw error('Product is not in this scenario response');
        const fields=['cropCompatibility','productPurpose','conditionRelevance','labelInformation','restrictions','missingInformation','unsupportedClaims','uncertainty','comments'];
        const values=fields.map(field=>bounded(body[field],2000));
        const result=await query('insert into public.evaluation_product_reviews(scenario_id,reviewer_id,product_id,verdict,crop_compatibility,product_purpose,condition_relevance,label_information,restrictions,missing_information,unsupported_claims,uncertainty,comments) select id,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13 from public.evaluation_product_scenarios where id=$1 returning id,created_at',[id,user.id,body.productId,body.verdict,...values]);
        if (!result.rows.length) throw error('Scenario not found',404);
        res.status(201).json({review:result.rows[0]});
    });
    const readSummary = async () => {
        const {rows}=await query('select record from public.evaluation_cases order by created_at desc,id desc limit 5001');
        if (rows.length > 5000) throw error('Summary exceeds 5,000 cases; use a bounded report',422);
        const cases=rows.map(r=>r.record);
        const counts=await query('select (select count(distinct case_id)::int from public.evaluation_reviews) as reviewed, (select count(*)::int from public.evaluation_usability_sessions) as usability, (select count(*)::int from public.evaluation_product_scenarios) as product_scenarios, (select count(*)::int from public.evaluation_product_reviews) as product_reviews');
        return {generatedAt:new Date().toISOString(), overall:calculateMetrics(cases), datasets:{PlantVillage:calculateMetrics(cases,{source:'PlantVillage'}),PlantDoc:calculateMetrics(cases,{source:'PlantDoc'})}, crops:calculateCropMetrics(cases), workflowVersions:[...new Set(cases.map(c => c.workflowVersion).filter(Boolean))].sort(), reviewed:counts.rows[0]?.reviewed ?? 0, productScenarios:counts.rows[0]?.product_scenarios ?? 0, productReviews:counts.rows[0]?.product_reviews ?? 0, usabilitySessions:counts.rows[0]?.usability ?? 0, limitations:'Public dataset agreement is not field-validated diagnostic accuracy. Dataset labels are not expert reviews.'};
    };
    route('get','/api/admin/evaluation/summary', async(req,res) => res.json(await readSummary()));
    route('get','/api/admin/evaluation/report', async(req,res) => res.json({report:buildEvaluationReport(await readSummary())}));
}
