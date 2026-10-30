import pg from 'pg';

const { Pool } = pg;
let pool;
let configuredUrl;

const getDatabaseUrl = () => String(process.env.DATABASE_URL || '').trim();

/**
 * Use Neon's pooled DATABASE_URL for application traffic. The unpooled URL is
 * reserved for migrations and administrative work, per Neon guidance.
 */
export const getNeonPool = () => {
    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) return null;

    if (!pool || configuredUrl !== databaseUrl) {
        if (pool) pool.end().catch(() => {});
        pool = new Pool({
            connectionString: databaseUrl,
            max: Math.min(Math.max(Number(process.env.DATABASE_POOL_MAX) || 5, 1), 20),
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 10_000,
            maxUses: 7500,
        });
        configuredUrl = databaseUrl;
    }

    return pool;
};

export const queryNeon = async (text, params = []) => {
    const client = getNeonPool();
    if (!client) {
        const error = new Error('Neon database is not configured.');
        error.code = 'NEON_NOT_CONFIGURED';
        error.status = 503;
        throw error;
    }
    return client.query(text, params);
};

export const withNeonTransaction = async (callback) => {
    const client = getNeonPool();
    if (!client) {
        const error = new Error('Neon database is not configured.');
        error.code = 'NEON_NOT_CONFIGURED';
        error.status = 503;
        throw error;
    }
    const connection = await client.connect();
    try {
        await connection.query('BEGIN');
        const result = await callback(connection);
        await connection.query('COMMIT');
        return result;
    } catch (error) {
        await connection.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        connection.release();
    }
};

export const checkNeonDatabase = async () => {
    const client = getNeonPool();
    if (!client) {
        return {
            provider: 'neon',
            configured: false,
            connected: false,
        };
    }

    try {
        const { rows } = await client.query('select 1 as ok');
        return {
            provider: 'neon',
            configured: true,
            connected: Number(rows?.[0]?.ok) === 1,
        };
    } catch (error) {
        console.warn('Neon database health check failed:', error.message);
        return {
            provider: 'neon',
            configured: true,
            connected: false,
            error: 'database_unavailable',
        };
    }
};
