import { DATA_CONSENT_VERSION } from '../../shared/dataConsent.js';
import { describe, it, expect, vi } from 'vitest';
import { applyDecisionCheck, createDecisionShadowService, resolveDecisionCheckMode } from './decisionShadowService.js';
import { trackAiUsage } from '../utils/aiUsage.js';
import { getScanSectionPolicy } from '../../shared/scanResultPolicy.js';
const image = 'data:image/jpeg;base64,/9j/';
const prediction = { disease: 'Apple scab', plantType: 'Apple', healthStatus: 'unhealthy', diseaseCategory: 'fungal', confidence: 92,
    status: 'high_confidence', analysisMetadata: {model:'openai/gpt-5.4-mini-2026-03-17'} };
const env = () => ({ DECISIONS_SHADOW_ENABLED:'true', AI_PROVIDER:'openrouter', OPENROUTER_API_KEY:'test-only', DECISIONS_SHADOW_MAX_REQUESTS:'3', DECISIONS_SHADOW_MAX_COST_USD:'.03' });
const input = () => ({prediction:structuredClone(prediction),treeImage:image,crop:'Apple',dataConsent:{aiImprovement:true,version:DATA_CONSENT_VERSION}});
const provider = (body, support=.2) => ({ model:body.model,usage:{input_tokens:100,output_tokens:0,cost:.0001},
    answers:Object.fromEntries(Object.keys(body.questions).map(name=>[name,name==='health_triage'
        ? {type:'choice',choice:'abnormal',confidence:.95} : {type:'noul',noul:name==='support_0'?support:name==='clear_enough'?.95:.1}])) });
const success = () => vi.fn(async (_url,options)=>({ok:true,status:200,json:async()=>provider(JSON.parse(options.body))}));
describe('Decisions shadow trial',()=>{
    it('records a hypothetical veto and usage without mutating the diagnosis or exposing images',async()=>{
        const fetchImpl=success(),check=createDecisionShadowService({env:env(),fetchImpl});
        const args=input(),before=JSON.stringify(args.prediction);
        const {result,usage}=await trackAiUsage(()=>check(args));
        expect(result).toMatchObject({status:'checked',mode:'shadow',wouldAddReview:true,baselineState:'confident_treatment',shadowState:'expert_review_needed'});
        expect(JSON.stringify(args.prediction)).toBe(before);
        expect(JSON.stringify(result)).not.toContain('base64');expect(JSON.stringify(result)).not.toContain('test-only');
        expect(usage).toMatchObject({calls:1,promptTokens:100,costUsd:.0001});
        expect(fetchImpl.mock.calls[0][0]).toBe('https://openrouter.ai/api/alpha/decisions');
    });
    it('does not contact the provider when disabled, without consent, or on another model',async()=>{
        const fetchImpl=success();
        for(const [settings,args]of [[{...env(),DECISIONS_SHADOW_ENABLED:'false'},input()],[env(),{...input(),dataConsent:{aiImprovement:false}}],
            [env(),{...input(),prediction:{...prediction,analysisMetadata:{model:'openai/gpt-6-luna'}}}]]) {
            expect((await createDecisionShadowService({env:settings,fetchImpl})(args)).status).toBe('skipped');
        }
        expect(fetchImpl).not.toHaveBeenCalled();
    });
    it('checks answers from Gemini 3.8 Flash as well',async()=>{
        const fetchImpl=success();
        const args={...input(),prediction:{...prediction,analysisMetadata:{model:'google/gemini-3.8-flash'}}};
        expect((await createDecisionShadowService({env:env(),fetchImpl})(args)).status).toBe('checked');
    });
    it('caps calls and reserves budget before concurrent requests',async()=>{
        const fetchImpl=success(),check=createDecisionShadowService({env:{...env(),DECISIONS_SHADOW_MAX_REQUESTS:'2',DECISIONS_SHADOW_MAX_COST_USD:'.01'},fetchImpl});
        const results=await Promise.all([check(input()),check(input())]);
        expect(results.map(r=>r.status).sort()).toEqual(['checked','skipped']);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });
    it('stops further requests if charged cost is unavailable',async()=>{
        const fetchImpl=vi.fn(async(_url,opts)=>({ok:true,status:200,json:async()=>({...provider(JSON.parse(opts.body)),usage:{input_tokens:100}})}));
        const check=createDecisionShadowService({env:env(),fetchImpl});
        expect(await check(input())).toMatchObject({status:'unavailable',reason:'missing_cost'});
        expect(await check(input())).toMatchObject({status:'skipped',reason:'trial_limit'});
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });
    it('bounds timeouts, handles errors without exposing provider messages, and preserves the primary result',async()=>{
        vi.useFakeTimers();
        try {
            const fetchImpl=vi.fn((_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('secret provider message')))));
            const check=createDecisionShadowService({env:{...env(),DECISIONS_SHADOW_TIMEOUT_MS:'100'},fetchImpl});
            const args=input(),before=JSON.stringify(args.prediction),pending=check(args);
            await vi.advanceTimersByTimeAsync(100);
            expect(await pending).toMatchObject({status:'unavailable',reason:'cancelled_or_timeout'});
            expect(JSON.stringify(args.prediction)).toBe(before);
        } finally {vi.useRealTimers();}
    });
    it('sends both photos once and rejects invalid trial limits',async()=>{
        const fetchImpl=success(),check=createDecisionShadowService({env:env(),fetchImpl});
        await check({...input(),leafImage:'data:image/png;base64,aGVsbG8='});
        const body=JSON.parse(fetchImpl.mock.calls[0][1].body);
        expect(body.state.filter(s=>typeof s==='object')).toHaveLength(2);
        expect(await createDecisionShadowService({env:{...env(),DECISIONS_SHADOW_MAX_REQUESTS:'500'},fetchImpl})(input())).toMatchObject({reason:'invalid_trial_limits'});
    });
});

it('enforces the request count even when cost remains available',async()=>{
    const fetchImpl=success(),check=createDecisionShadowService({env:{...env(),DECISIONS_SHADOW_MAX_REQUESTS:'1'},fetchImpl});
    expect((await check(input())).status).toBe('checked');
    expect(await check(input())).toMatchObject({status:'skipped',reason:'trial_limit'});
    expect(fetchImpl).toHaveBeenCalledTimes(1);
});

describe('Decisions enforce mode',()=>{
    const enforceEnv=()=>({DECISIONS_CHECK_MODE:'enforce',AI_PROVIDER:'openrouter',OPENROUTER_API_KEY:'test-only'});
    const answering=(answers)=>vi.fn(async(_url,options)=>{const body=JSON.parse(options.body);
        return {ok:true,status:200,json:async()=>({usage:{input_tokens:10,output_tokens:0,cost:.0001},
            answers:Object.fromEntries(Object.keys(body.questions).map(name=>[name,answers(name)]))})};});
    const predicate=p=>({type:'noul',noul:p});
    it('does not need improvement consent and asks about the look-alikes too',async()=>{
        const fetchImpl=answering(name=>name==='health_triage'?{type:'choice',choice:'abnormal',confidence:.95}:predicate(name==='support_0'?.9:name==='clear_enough'?.95:.1));
        const check=createDecisionShadowService({env:enforceEnv(),fetchImpl});
        const result=await check({...input(),dataConsent:{aiImprovement:false},
            prediction:{...structuredClone(prediction),differentialDiagnoses:[{name:'Apple rust'}]}});
        expect(result).toMatchObject({status:'checked',mode:'enforce',applied:false,reasons:[]});
        expect(Object.keys(JSON.parse(fetchImpl.mock.calls[0][1].body).questions)).toEqual(expect.arrayContaining(['support_0','support_1']));
    });
    it('sends a treatment result to review when a look-alike fits the photo better',async()=>{
        const fetchImpl=answering(name=>name==='health_triage'?{type:'choice',choice:'abnormal',confidence:.95}
            :predicate(name==='support_0'?.3:name==='support_1'?.9:name==='clear_enough'?.95:.1));
        const check=createDecisionShadowService({env:enforceEnv(),fetchImpl});
        const original={...structuredClone(prediction),differentialDiagnoses:[{name:'Apple rust'}],treatments:['spray'],
            structuredAssessment:{assessment:{needs_expert_review:false},recommendations:{product_matching_eligible:true,chemical_treatment_withheld:false}}};
        const result=await check({...input(),prediction:original});
        expect(result).toMatchObject({applied:true,supportedAlternatives:['Apple rust'],shadowState:'expert_review_needed'});
        expect(result.reasons).toEqual(expect.arrayContaining(['insufficient_diagnosis_support','alternative_better_supported']));
        const applied=applyDecisionCheck(structuredClone(original),result,'ms');
        expect(applied).toMatchObject({treatmentEligible:false,treatments:[],resultState:'expert_review_needed',
            secondCheck:{applied:true,supportedAlternatives:['Apple rust']}});
        expect(applied.abstainReason).toMatch(/Apple rust/);
        expect(applied.structuredAssessment.recommendations).toMatchObject({product_matching_eligible:false,chemical_treatment_withheld:true});
    });
    it('takes fertiliser suggestions away when the photo does not back the deficiency',async()=>{
        const deficiency={disease:'Potassium Deficiency',plantType:'Rice',healthStatus:'unhealthy',diseaseCategory:'nutrient',
            resultState:'possible_nutrient_issue',confidence:80,nutritionalIssues:{status:'confirmed',deficientNutrients:['Potassium']},
            differentialDiagnoses:[{name:'Bacterial Leaf Blight'}],analysisMetadata:{model:'google/gemini-3.8-flash'}};
        const doubts=createDecisionShadowService({env:enforceEnv(),fetchImpl:answering(name=>name==='health_triage'
            ?{type:'choice',choice:'abnormal',confidence:.95}:predicate(name==='support_0'?.2:name==='support_1'?.9:name==='clear_enough'?.95:.1))});
        const result=await doubts({...input(),prediction:structuredClone(deficiency)});
        expect(result).toMatchObject({applied:true,wouldRemoveProducts:true,supportedAlternatives:['Bacterial Leaf Blight']});
        const applied=applyDecisionCheck(structuredClone(deficiency),result,'en');
        expect(getScanSectionPolicy(applied)).toMatchObject({showNutritionProducts:false,showDiseaseProducts:false});
        expect(applied.abstainReason).toMatch(/Bacterial Leaf Blight.*any product/);
        const agrees=createDecisionShadowService({env:enforceEnv(),fetchImpl:answering(name=>name==='health_triage'
            ?{type:'choice',choice:'abnormal',confidence:.95}:predicate(name==='support_0'?.9:name==='clear_enough'?.95:.1))});
        expect(await agrees({...input(),prediction:structuredClone(deficiency)})).toMatchObject({applied:false,reasons:[]});
    });
    it('keeps a healthy result when the checker is merely unsure, and reviews it on clear signs',async()=>{
        const healthy={disease:'Healthy',plantType:'Apple',healthStatus:'healthy',status:'healthy',diagnosisConfidence:92,confidence:92,
            confidenceLevel:'high',analysisMetadata:{model:'openai/gpt-5.4-mini'}};
        const unsure=createDecisionShadowService({env:enforceEnv(),fetchImpl:answering(name=>name==='health_triage'
            ?{type:'choice',choice:'unclear',confidence:.6}:predicate(.4))});
        expect(await unsure({...input(),prediction:structuredClone(healthy)})).toMatchObject({applied:false});
        const signs=createDecisionShadowService({env:enforceEnv(),fetchImpl:answering(name=>name==='health_triage'
            ?{type:'choice',choice:'abnormal',confidence:.9}:predicate(name==='powderyFilm'?.95:.2))});
        const result=await signs({...input(),prediction:structuredClone(healthy)});
        expect(result).toMatchObject({applied:true,reasons:['healthy_disagreement']});
        expect(applyDecisionCheck(structuredClone(healthy),result,'en')).toMatchObject({healthStatus:'unknown',resultState:'expert_review_needed'});
    });
    it('leaves the result alone when the check fails',async()=>{
        const check=createDecisionShadowService({env:enforceEnv(),fetchImpl:vi.fn(async()=>({ok:false,status:503,json:async()=>({usage:{cost:0}})}))});
        const result=await check(input());
        expect(result).toMatchObject({status:'unavailable'});
        const original=structuredClone(prediction);
        expect(applyDecisionCheck(original,result)).toEqual(prediction);
    });
    it('reads the old flag as shadow mode and defaults to off',()=>{
        expect(resolveDecisionCheckMode({DECISIONS_SHADOW_ENABLED:'true'})).toBe('shadow');
        expect(resolveDecisionCheckMode({})).toBe('off');
        expect(resolveDecisionCheckMode({DECISIONS_CHECK_MODE:'enforce',DECISIONS_SHADOW_ENABLED:'true'})).toBe('enforce');
    });
});
