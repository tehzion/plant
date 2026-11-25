import { describe,it,expect } from 'vitest';
import { assessScanDecision,getScanSectionPolicy } from '../../shared/scanResultPolicy.js';
import { mergeDiagnosisResult } from '../services/aiService.js';
const base={schemaVersion:2,plantType:'Apple',disease:'Apple scab',healthStatus:'unhealthy',diseaseCategory:'fungal',
    diagnosisConfidence:92,confidence:92,status:'high_confidence',captureAssessment:{imageQualityConfidence:90}};
const cases=[
    ['contradictory health label',{healthStatus:'healthy'}],
    ['explicitly unknown health',{healthStatus:'unknown'}],
    ['weak disease evidence',{diagnosisConfidence:50}],
    ['missing evidence',{needsMoreEvidence:true}],
    ['explicit review flag',{needsReview:true}],
    ['expert review flag',{expertReviewRequired:true}],
    ['blurred image',{requiresRetake:true}],
    ['low image quality',{captureAssessment:{imageQualityConfidence:30}}],
    ['schema validation failed',{validationIssues:['missing_supporting_evidence']}],
    ['missing blight comparison',{plantType:'Tomato',disease:'Early Blight',differentialDiagnoses:[]}],
    ['subtle mites on a green leaf',{disease:'No Issues',healthStatus:'healthy',confidenceLevel:'high',subtleSigns:{paleStippling:'present'}}],
    ['unclear powdery film',{disease:'No Issues',healthStatus:'healthy',confidenceLevel:'high',subtleSigns:{powderyFilm:'unclear'}}],
];
describe('diagnosis release safety contract',()=>{
    it.each(cases)('blocks treatment and healthy reassurance for %s',(_name,override)=>{
        const result={...base,...override};
        expect(assessScanDecision(result).treatmentEligible).toBe(false);
        expect(assessScanDecision(result).healthy).toBe(false);
        expect(getScanSectionPolicy(result).showDiseaseProducts).toBe(false);
    });
    it('still allows a complete confident diagnosis and a clear healthy result',()=>{
        expect(assessScanDecision(base).treatmentEligible).toBe(true);
        expect(assessScanDecision({...base,disease:'No Issues',healthStatus:'healthy',diseaseCategory:'healthy',confidenceLevel:'high',subtleSigns:{paleStippling:'absent'}}).healthy).toBe(true);
    });
    it('merges a model contradiction into review instead of allowing treatment',()=>{
        const result=mergeDiagnosisResult({language:'en',category:'Fruits',plantNetResult:null,speciesAssessment:{confidence:55},speciesContext:{confirmed:false},stageTwo:null,
            stageOne:{capture_assessment:{imageQualityConfidence:90,requiresRetake:false,detailSufficient:true},
                diagnosis_assessment:{primaryDiagnosis:'Apple scab',plantType:'Apple',healthStatus:'healthy',severity:'mild',diseaseCategory:'fungal',diagnosisConfidence:95,needsMoreEvidence:false,symptoms:['spots'],diagnosticEvidence:{evidenceFor:['spots'],evidenceAgainst:[]}}}});
        expect(result.validationIssues).toContain('conflicting_health_status');
        expect(assessScanDecision(result).treatmentEligible).toBe(false);
        expect(assessScanDecision(result).healthy).toBe(false);
    });
});
