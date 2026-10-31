import { describe,it,expect } from 'vitest';
import { planDevelopmentExperiment,buildReferenceContent,ExperimentBudget } from './developmentExperiments.js';
import { retrieveReferences,bmpFeatures } from './visualRetrieval.js';
const features=n=>({vector:Array(72).fill(n),averageHash:Array.from({length:1024},(_,i)=>(i+n)%4===0?'1':'0').join('')});
const images=Array.from({length:5},(_,n)=>({checksum:String(n),features:features(n),crop:'Apple',originalLabel:'scab',source:'PlantVillage'}));
const split={freezeId:'f',selected:[{checksum:'reserved'}],development:images};
const index={freezeId:'f',images};
describe('development experiment isolation',()=>{
    it('never permits reserved or unassigned images in queries or references',()=>{
        expect(()=>planDevelopmentExperiment(split,{...index,images:[...images,{...images[0],checksum:'reserved'}]},{sample:1})).toThrow();
        expect(()=>retrieveReferences({...images[0],checksum:'reserved'},images,{allowedChecksums:['reserved'],reservedChecksums:['reserved']})).toThrow();
        expect(retrieveReferences(images[0],[...images,{...images[1],checksum:'reserved'}],{allowedChecksums:images.map(i=>i.checksum),reservedChecksums:['reserved']})).not.toEqual(expect.arrayContaining([expect.objectContaining({checksum:'reserved'})]));
    });
    it('excludes identical features, the query itself and known related photos',()=>{
        const candidates=[{...images[1],features:images[0].features},{...images[2],leakageGroup:'plant-1'},images[3]];
        const r=retrieveReferences({...images[0],leakageGroup:'plant-1'},candidates,{allowedChecksums:images.map(i=>i.checksum)});
        expect(r.map(i=>i.checksum)).toEqual(['3']);
    });
    it('pairs all variants on identical queries and references without using target labels to rank',()=>{
        const a=planDevelopmentExperiment(split,index,{sample:2});
        const b=planDevelopmentExperiment({...split,development:images.map(i=>({...i,originalLabel:'OTHER'}))},{...index,images:images.map(i=>({...i,originalLabel:'OTHER'}))},{sample:2});
        expect(a.variants).toHaveLength(4);
        expect(a.cases.every(c=>c.references.every(r=>r.checksum!==c.query.checksum))).toBe(true);
        expect(b.cases).toHaveLength(2);
        expect(JSON.stringify(buildReferenceContent([images[0]],['data:test']))).toContain('unverified');
    });
    it('stops before exceeding the reserve and fails closed on unknown costs',()=>{
        const budget=new ExperimentBudget(.3,{reservePerRequest:.15});
        expect(budget.reserve()).toBe(true);budget.settle(.2);
        expect(budget.reserve()).toBe(false);
        expect(()=>new ExperimentBudget(4)).toThrow();
        const other=new ExperimentBudget(1);other.reserve();expect(()=>other.settle(null)).toThrow();expect(other.reserve()).toBe(false);
    });
    it('rejects malformed image features rather than ranking corrupt bytes',()=>{
        expect(()=>bmpFeatures(Buffer.from('not a bmp'))).toThrow();
        expect(()=>retrieveReferences({...images[0],features:{vector:[NaN]}},images,{allowedChecksums:images.map(i=>i.checksum)})).toThrow();
    });
});

describe('crop-matched reference retrieval',()=>{
    it('rejects wrong-crop matches even when their colours are closer',()=>{
        const query={...images[0],crop:'Corn (maize)'};
        const candidates=[{...images[1],crop:'Tomato'},{...images[2],crop:'Corn'}];
        const refs=retrieveReferences(query,candidates,{allowedChecksums:images.map(i=>i.checksum)});
        expect(refs.map(r=>r.checksum)).toEqual(['2']);
    });
});
