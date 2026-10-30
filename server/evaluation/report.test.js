import { describe, expect, it } from 'vitest';
import { calculateMetrics } from './metrics.js';
import { buildEvaluationReport } from './report.js';
describe('preliminary report',()=>{
 it('uses honest empty states and retains dataset and human evidence separately',()=>{
  const empty=calculateMetrics([]);
  const report=buildEvaluationReport({generatedAt:'2026-01-01T00:00:00Z',overall:empty,datasets:{PlantVillage:empty,PlantDoc:empty},reviewed:0,usabilitySessions:0});
  expect(report).toContain('No benchmark assessments have been imported');
  expect(report).toContain('Farmer usability testing: Not yet conducted');
  expect(report).toContain('not field-validated diagnostic accuracy');
  expect(report).not.toContain('NaN');
 });
});
