import 'dotenv/config';
import { getAssessmentMetrics } from '../services/assessmentMetrics.js';

// Usage: npm run audit:metrics -- 30   (number of days, default 30). Read-only.
try {
    const days = Number(process.argv[2] || 30);
    console.log(JSON.stringify(await getAssessmentMetrics({ days }), null, 2));
} catch (error) {
    console.error(JSON.stringify({ event: 'assessment_metrics_failed', message: error.message }));
    process.exitCode = 1;
}
