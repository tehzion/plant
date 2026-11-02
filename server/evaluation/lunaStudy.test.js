import { describe,it,expect } from 'vitest';
import { planLunaStudy,diagnosisRequest,decisionsRequest,parseDecisions,shadowVeto,estimateStudyCost,summarizeDecisionStudy,LUNA_STUDY_VARIANTS } from './lunaStudy.js';
import { assessScanDecision } from '../../shared/scanResultPolicy.js';
const image = n => ({ checksum:String(n),crop:'Apple',originalLabel:'scab',source:'PlantVillage' });
const split = {freezeId:'f',development:[image(1),image(2),image(3)],selected:[image(4)]};
const index = {freezeId:'f',images:split.development};
const predicate = probability => ({type:'predicate',probability});
const healthy = {plantType:'Apple',disease:'No Issues',healthStatus:'healthy',confidence:95,status:'high_confidence'};
const answers = {clear_enough:predicate(.95),visible_abnormality:predicate(.01),health_triage:{type:'choice',choice:'healthy',confidence:.95},support_0:predicate(.95),
    paleStippling:predicate(.01),powderyFilm:predicate(.01),blotchyMottling:predicate(.01),smallSpots:predicate(.01),velvetySpots:predicate(.01),curlingOrDistortion:predicate(.01)};
describe('Luna development study',()=>{
    it('keeps the reserved and unassigned pool out of the study',()=>{
        expect(planLunaStudy(split,index,{sample:2}).cases).toHaveLength(2);
        expect(()=>planLunaStudy(split,{...index,images:[...index.images,image(4)]},{sample:2})).toThrow();
        expect(()=>planLunaStudy(split,{...index,images:[image(1),image(1)]},{sample:1})).toThrow();
    });
    it('sets reasoning explicitly and omits unsupported temperature and legacy token controls',()=>{
        for(const variant of LUNA_STUDY_VARIANTS) {
            const body=diagnosisRequest(variant,[]);
            expect(body.reasoning_effort).toBe(variant.effort);
            expect(body.max_completion_tokens).toBe(6000);expect(body).not.toHaveProperty('temperature');expect(body).not.toHaveProperty('max_tokens');
        }
    });
    it('does not supply the reference label to Decisions and always includes an unclear option',()=>{
        const body=decisionsRequest('data:image/jpeg;base64,x','Apple',[{disease:'candidate-only'}]);
        expect(body.questions.find(q=>q.name==='health_triage').choices.map(c=>c.value)).toContain('unclear');
        expect(JSON.stringify(body.input)).not.toContain('candidate-only');
        expect(JSON.stringify(body)).not.toContain('scab');
        expect(body.questions.find(q=>q.name==='support_0').instructions).toContain('candidate-only');
    });
    it('rejects missing, duplicate and out-of-range answers, while retaining refusals',()=>{
        expect(()=>parseDecisions({answers:[]},['x'])).toThrow();
        expect(()=>parseDecisions({answers:[{name:'x',...predicate(2)}]},['x'])).toThrow();
        expect(()=>parseDecisions({answers:[{name:'x',...predicate(.5)},{name:'x',...predicate(.5)}]},['x','y'])).toThrow();
        expect(parseDecisions({answers:[{name:'x',type:'refusal'}]},['x']).x.type).toBe('refusal');
    });
    it('can only add caution, and blocks unsupported healthy reassurance',()=>{
        expect(assessScanDecision(shadowVeto(healthy,answers,'support_0').prediction).healthy).toBe(true);
        const disputed=shadowVeto(healthy,{...answers,paleStippling:predicate(.9)},'support_0');
        expect(assessScanDecision(disputed.prediction).healthy).toBe(false);
        expect(assessScanDecision(shadowVeto({...healthy,needsReview:true},answers,'support_0').prediction).healthy).toBe(false);
        expect(assessScanDecision(shadowVeto(healthy,{},'support_0').prediction).treatmentEligible).toBe(false);
    });
    it('counts cache writes and cached reads once and does not charge Decisions output',()=>{
        const cost=estimateStudyCost('gpt-6-luna','decisions',{input_tokens:1000,output_tokens:500,input_tokens_details:{cached_tokens:200,cache_write_tokens:300}});
        expect(cost.estimatedUsd).toBeCloseTo((500*.1+200*.01+300*.125)/1e6);
        expect(cost.conservativeUsd).toBeCloseTo(1000*.125/1e6);
        expect(()=>estimateStudyCost('gpt-6-luna','decisions',{input_tokens:100,output_tokens:0,input_tokens_details:{cached_tokens:200}})).toThrow();
        expect(()=>estimateStudyCost('gpt-6-luna','chat/completions',{})).toThrow();
    });
    it('counts diseased-called-healthy separately from uncertain triage',()=>{
        const report=summarizeDecisionStudy([{checksum:'1',originalLabel:'scab',completed:true,answers,durationMs:10},
            {checksum:'2',originalLabel:'scab',completed:true,answers:{...answers,health_triage:{type:'choice',choice:'unclear',confidence:.9}},durationMs:10},
            {checksum:'3',completed:false}]);
        expect(report.diseasedCalledHealthy).toBe(1);expect(report.review).toBe(1);expect(report.failed).toBe(1);
    });
});

describe('OpenRouter Decisions protocol',()=>{
    it('uses the dedicated model, answer map and top-level image parts',async()=>{
        const {routerDecisionsRequest}=await import('./lunaStudy.js');
        const body=routerDecisionsRequest('data:image/jpeg;base64,x','Apple',[]);
        expect(body.model).toBe('openai/gpt-6-luna-decisions');
        expect(body.state[1]).toMatchObject({type:'image_url',image_url:{url:'data:image/jpeg;base64,x'}});
        expect(body.questions.clear_enough.type).toBe('noul');
        expect(body.questions.health_triage.criteria).toHaveProperty('unclear');
        expect(body).not.toHaveProperty('input');
    });
    it('normalizes real typed answers and rejects missing/out-of-range answers',async()=>{
        const {parseRouterDecisions}=await import('./lunaStudy.js');
        const parsed=parseRouterDecisions({answers:{clear_enough:{type:'noul',noul:.85},health_triage:{type:'choice',choice:'abnormal',confidence:.8}}},['clear_enough','health_triage']);
        expect(parsed.clear_enough.probability).toBe(.85);
        expect(parsed.health_triage.choice).toBe('abnormal');
        expect(()=>parseRouterDecisions({answers:{x:{type:'noul',noul:2}}},['x'])).toThrow();
    });
});

it('rejects incorrect triage types and strips extra provider fields',()=>{
    expect(()=>parseDecisions({answers:[{name:'health_triage',type:'predicate',probability:.9}]},['health_triage'])).toThrow();
    const result=parseDecisions({answers:[{name:'x',type:'predicate',probability:.9,debug:'private'}]},['x']);
    expect(result.x).not.toHaveProperty('debug');
});
