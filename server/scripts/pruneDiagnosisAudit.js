import 'dotenv/config';
import { pruneDiagnosisAudit } from '../services/diagnosisAuditService.js';
const result = await pruneDiagnosisAudit();
console.log(`Removed ${result.deletedScans} diagnosis audit records older than ${result.cutoff}`);
