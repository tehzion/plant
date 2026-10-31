import pg from 'pg';
import { queryNeon } from '../utils/neonDatabase.js';

let pool;
let configuredUrl;

// Keep evaluation records on their own branch without changing the farmer database.
export async function queryEvaluation(text, params = []) {
    const url = String(process.env.EVALUATION_DATABASE_URL || '').trim();
    if (!url) return queryNeon(text, params);
    if (!pool || configuredUrl !== url) {
        if (pool) await pool.end();
        pool = new pg.Pool({ connectionString: url, max: 3, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
        configuredUrl = url;
    }
    return pool.query(text, params);
}
