import { describe,it,expect } from 'vitest';
import { summarizeDevelopment, developmentReportMarkdown, compareDevelopmentRuns } from './developmentReport.js';
const row=(checksum,override={})=>({checksum,runId:'baseline',source:'PlantVillage',crop:'Apple',originalLabel:'scab',completed:true,
    prediction:{plantType:'Apple',disease:'Scab',healthStatus:'unhealthy',status:'high_confidence',diseaseCategory:'fungal',diagnosisConfidence:90},...override});
describe('development report denominators',()=>{
    it('keeps failed and review cases visible instead of inflating accuracy',()=>{
        const r=summarizeDevelopment([row('a'),row('b',{prediction:{plantType:'Apple',disease:'Rust',healthStatus:'unhealthy',needsMoreEvidence:true}}),row('c',{completed:false,prediction:{error:'timeout'}})]);
        expect(r.overall.top1Agreement).toMatchObject({numerator:1,denominator:2});
        expect(r.overall.endToEndTop1).toMatchObject({numerator:1,denominator:3});
        expect(r.overall.reviewed).toBe(1);expect(r.overall.failed).toBe(1);
        expect(r.byCondition['apple / scab'].attempted).toBe(3);
        expect(developmentReportMarkdown(r)).toContain('1/2');
    });
    it('counts missed disease separately from correct abstention and wrong treatment',()=>{
        const p={plantType:'Apple',disease:'No Issues',healthStatus:'healthy',confidence:95};
        const r=summarizeDevelopment([row('a',{prediction:p}),row('b',{prediction:{...p,needsMoreEvidence:true}}),row('c',{prediction:{...row('c').prediction,disease:'Rust'}})]);
        expect(r.overall.missedDiseaseRate).toMatchObject({numerator:1,denominator:3});
        expect(r.overall.incorrectTreatment).toBe(1);expect(r.overall.safetyCases).toHaveLength(2);
    });
    it('does not score missing costs or times as zero and rejects duplicate records',()=>{
        expect(summarizeDevelopment([row('a')]).overall.meanDurationMs).toBeNull();
        expect(summarizeDevelopment([row('a')]).overall.costReported).toBe(0);
        expect(()=>summarizeDevelopment([row('a'),row('a')])).toThrow();
        expect(summarizeDevelopment([]).overall.top1Agreement.value).toBeNull();
    });
});

describe('healthy labels with crop prefixes',()=>{
    it('recognizes PlantDoc healthy leaves without mistaking unhealthy for healthy',()=>{
        const p={plantType:'Tomato',disease:'No Issues',healthStatus:'healthy',confidence:95};
        const report=summarizeDevelopment([row('a',{crop:'Tomato',originalLabel:'Tomato healthy',prediction:p})]);
        expect(report.overall.healthyReferences).toBe(1);expect(report.overall.missedDisease).toBe(0);
        const contradiction=summarizeDevelopment([row('b',{crop:'Tomato',originalLabel:'Tomato healthy',prediction:{...p,disease:'Blight'}})]);
        expect(contradiction.overall.top1).toBe(0);
    });
});

describe('paired comparisons',()=>{
    it('reports missing counterparts and compares only shared images',()=>{
        const rows=[row('a'),row('b'),row('a',{runId:'candidate',prediction:{...row('a').prediction,disease:'Rust'}})];
        const result=compareDevelopmentRuns(rows,'baseline','candidate');
        expect(result.pairedImages).toBe(1);expect(result.missingCandidate).toEqual(['b']);expect(result.losses).toBe(1);
    });
    it('rejects reference changes between model runs',()=>{
        expect(()=>compareDevelopmentRuns([row('a'),row('a',{runId:'candidate',originalLabel:'healthy'})],'baseline','candidate')).toThrow();
    });
});

describe('treatment scoring crop names',()=>{
    it('does not invent incorrect treatment when the model appends a scientific name',()=>{
        const p={...row('a').prediction,plantType:'Apple (Malus domestica)'};
        const report=summarizeDevelopment([row('a',{prediction:p})]);
        expect(report.overall.cropCorrect).toBe(1);expect(report.overall.incorrectTreatment).toBe(0);
    });
});
