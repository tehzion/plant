import { it,expect } from 'vitest';
import { summarizeDecisionShadow } from './decisionShadowMetrics.js';
it('keeps unobserved scans, unavailable checks and unknown costs visible',()=>{
    const r=summarizeDecisionShadow([{}, {metadata:{decisionShadow:{status:'skipped'}}},
        {metadata:{decisionShadow:{status:'unavailable',durationMs:3000}}},
        {metadata:{decisionShadow:{status:'checked',costUsd:.0002,durationMs:1000,wouldAddReview:true,baselineState:'confident_treatment',shadowState:'expert_review_needed',reasons:['insufficient_diagnosis_support']}}}]);
    expect(r).toMatchObject({records:4,checked:1,unavailable:1,skipped:1,unobserved:1,wouldAddReview:1,baselineTreatment:1,shadowTreatment:0,pricedRequests:1,unpricedRequests:1,knownCostUsd:.0002,meanAddedLatencyMs:2000});
});
it('reports no timing evidence instead of zero latency for an empty trial',()=>{
    expect(summarizeDecisionShadow([]).meanAddedLatencyMs).toBeNull();
});
