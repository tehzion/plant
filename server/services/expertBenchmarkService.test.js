import { describe, expect, it } from 'vitest';
import { evaluateExpertBenchmark } from './expertBenchmarkService.js';

it('reports top-one, top-three, health and confident-error rates', () => {
    const result = evaluateExpertBenchmark([
        { label: { crop: 'durian', diagnosis: 'leaf blight', healthState: 'disease' }, prediction: { disease: 'Leaf blight', healthStatus: 'disease', confidence: 90 } },
        { label: { crop: 'durian', diagnosis: 'rust', healthState: 'disease' }, prediction: { disease: 'mildew', differentialDiagnoses: ['rust'], healthStatus: 'disease', confidence: 85 } },
    ]);
    expect(result.sampleSize).toBe(2);
    expect(result.top1Rate).toBe(0.5);
    expect(result.top3Rate).toBe(1);
    expect(result.confidentlyWrongRate).toBe(0.5);
    expect(result.cropResults.durian.cases).toBe(2);
});
