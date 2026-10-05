import 'dotenv/config';
import { pruneDiagnosisAudit } from '../services/diagnosisAuditService.js';

try {
    const result = await pruneDiagnosisAudit();
    console.log(JSON.stringify({ event: 'diagnosis_audit_prune_succeeded', ...result }));
} catch (error) {
    console.error(JSON.stringify({ event: 'diagnosis_audit_prune_failed', message: error.message }));
    process.exitCode = 1;
}
