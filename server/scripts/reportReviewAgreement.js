import 'dotenv/config';
import { getReviewAgreement } from '../services/reviewAgreementService.js';
import { getNeonPool } from '../utils/neonDatabase.js';
try { console.log(JSON.stringify(await getReviewAgreement({ days: Number(process.argv[2] || 30) }), null, 2)); }
catch { console.error('Review agreement is unavailable. Check database access, migrations and the reporting window.'); process.exitCode = 1; }
finally { await getNeonPool()?.end(); }
