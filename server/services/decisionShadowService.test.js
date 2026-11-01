import { describe, it, expect, vi } from 'vitest';
import { createDecisionShadowService } from './decisionShadowService.js';
import { trackAiUsage } from '../utils/aiUsage.js';
const image = 'data:image/jpeg;base64,/9j/';
const prediction = { disease: 'Apple scab', plantType: 'Apple', healthStatus: 'unhealthy', diseaseCategory: 'fungal', confidence: 92,
    status: 'high_confidence', analysisMetadata: {model:'openai/gpt-5.4-mini-2026-03-17'} };
const env = () => ({ DECISIONS_SHADOW_ENABLED:'true', AI_PROVIDER:'openrouter', OPENROUTER_API_KEY:'test-only', DECISIONS_SHADOW_MAX_REQUESTS:'3', DECISIONS_SHADOW_MAX_COST_USD:'.03' });
const input = () => ({prediction:structuredClone(prediction),treeImage:image,crop:'Apple',dataConsent:{aiImprovement:true}});
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
