import { createHash } from 'node:crypto';
import { retrieveReferences } from './visualRetrieval.js';
const hash = value => createHash('sha256').update(value).digest('hex');
export function planDevelopmentExperiment(split, index, {sample=8, models=['openai/gpt-5.4-mini','google/gemini-2.5-flash']}={}) {
    if(index.freezeId!==split.freezeId || !Number.isInteger(sample) || sample<1 || sample>20
        || models.length!==2 || new Set(models).size!==2 || models.some(m=>!m || typeof m!=='string')) throw Error('Invalid paired experiment configuration');
    const allowed=split.development.map(r=>r.checksum), reserved=split.selected.map(r=>r.checksum);
    const allowedSet=new Set(allowed), reservedSet=new Set(reserved), seen=new Set();
    const images=index.images.filter(item=>{
        if(seen.has(item.checksum)) throw Error('Duplicate image in retrieval index');
        seen.add(item.checksum);
        if(!allowedSet.has(item.checksum) || reservedSet.has(item.checksum)) throw Error('Retrieval index contains non-development images');
        return !item.excluded;
    });
    const groups=new Map();
    for(const item of [...images].sort((a,b)=>hash(a.checksum).localeCompare(hash(b.checksum)))) {
        const key=`${item.source}|${item.crop}|${item.originalLabel}`;
        if(!groups.has(key)) groups.set(key,[]);
        groups.get(key).push(item);
    }
    const selected=[];
    // Seeded order over strata avoids taking only alphabetically early crops.
    const keys=[...groups.keys()].sort((a,b)=>hash(a).localeCompare(hash(b)));
    while(selected.length<sample && keys.some(k=>groups.get(k).length)) {
        for(const k of keys) { const item=groups.get(k).shift(); if(item && selected.length<sample) selected.push(item); }
    }
    if(selected.length!==sample) throw Error('Insufficient development images');
    const variants=models.flatMap(model=>[{id:`${model}:baseline`,model,retrieval:false},{id:`${model}:retrieval`,model,retrieval:true}]);
    const cases=selected.map(query=>({query,references:retrieveReferences(query,images,{allowedChecksums:allowed,reservedChecksums:reserved,limit:2})}));
    if(cases.some(c=>c.references.length!==2)) throw Error('Two independent reference candidates required per query');
    const identity={freezeId:split.freezeId,variants,cases:cases.map(c=>({checksum:c.query.checksum,references:c.references.map(r=>r.checksum)}))};
    return {...identity,planId:hash(JSON.stringify(identity)),cases,description:'Development-only, diagnosis-stage comparison; identical crop input; crop-matched RGB retrieval baseline; reference labels unverified; group provenance incomplete.'};
}

export function buildReferenceContent(references, imageUrls) {
    if(references.length!==imageUrls.length) throw Error('Missing reference image');
    return [{type:'text',text:'The following are retrieved comparison images, NOT the farmer query. Their public-dataset labels are unverified examples, not the answer. Similar colour or background is not disease evidence. Compare visible symptoms and explain disagreement. Do not increase confidence just because a reference is similar.'},
        ...references.flatMap((r,i)=>[{type:'text',text:`Comparison ${i+1}: dataset crop ${JSON.stringify(r.crop)}; unverified dataset condition ${JSON.stringify(r.originalLabel)}.`},
            {type:'image_url',image_url:{url:imageUrls[i],detail:'auto'}}])];
}

export class ExperimentBudget {
    constructor(limitUsd,{reservePerRequest=0.15}={}) {
        if(!Number.isFinite(limitUsd) || limitUsd<=0 || limitUsd>3 || !Number.isFinite(reservePerRequest) || reservePerRequest<=0) throw Error('Budget must be >0 and <= approved US$3');
        this.limitUsd=limitUsd;this.reservePerRequest=reservePerRequest;this.spentUsd=0;this.pending=false;
    }
    reserve(observedSpend=0) {
        if(this.pending || !Number.isFinite(observedSpend) || observedSpend<0) throw Error('Invalid budget accounting');
        this.spentUsd=Math.max(this.spentUsd,observedSpend);
        if(this.spentUsd+this.reservePerRequest>this.limitUsd) return false;
        this.pending=true;return true;
    }
    settle(costUsd) {
        if(!this.pending) throw Error('No request reserved');
        this.pending=false;
        if(!Number.isFinite(costUsd) || costUsd<0) { this.spentUsd=this.limitUsd; throw Error('Missing charged cost; stop further requests'); }
        this.spentUsd+=costUsd;
        if(this.spentUsd>this.limitUsd) throw Error('Budget exceeded; stop further requests');
    }
}
