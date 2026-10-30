import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { queryNeon } from '../utils/neonDatabase.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const TABLES = [
    ['profiles', ['user_id']],
    ['plots', ['id']],
    ['scan_history', ['id']],
    ['mygap_logs', ['id']],
    ['mygap_checklist', ['user_id']],
    ['daily_notes', ['id']],
    ['order_refs', ['id']],
    ['order_recovery_requests', ['id']],
    ['consultation_leads', ['id']],
    ['product_events', ['id']],
    ['disease_product_rules', ['id']],
    ['diagnosis_training_logs', ['id']],
    ['diagnosis_feedback', ['id']],
    ['scan_followup_events', ['id']],
    ['activity_revisions', ['id']],
    ['diagnosis_expert_labels', ['id']],
    ['ai_usage_counters', ['identity_key', 'window_date']],
    ['ai_analysis_requests', ['identity_key', 'scan_id']],
];

const identifier = (value) => {
    if (!/^[a-z_]+$/.test(value)) throw new Error(`Unsafe identifier: ${value}`);
    return value;
};

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !supabaseKey) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this migration.');
if (!process.env.DATABASE_URL) throw new Error('Set the pooled Neon DATABASE_URL before running this migration.');

const source = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });

const copyTable = async (table, conflictColumns) => {
    let offset = 0;
    let copied = 0;
    while (true) {
        const { data, error } = await source.from(table).select('*').range(offset, offset + 499);
        if (error) throw new Error(`${table}: ${error.message}`);
        if (!data?.length) break;
        for (const row of data) {
            const columns = Object.keys(row).map(identifier);
            const values = columns.map((column) => row[column]);
            const updates = columns
                .filter((column) => !conflictColumns.includes(column))
                .map((column) => `${column} = excluded.${column}`);
            const conflict = conflictColumns.map(identifier).join(', ');
            const action = updates.length ? `do update set ${updates.join(', ')}` : 'do nothing';
            await queryNeon(
                `insert into public.${identifier(table)} (${columns.join(', ')}) values (${values.map((_, index) => `$${index + 1}`).join(', ')}) on conflict (${conflict}) ${action}`,
                values,
            );
            copied += 1;
        }
        offset += data.length;
        if (data.length < 500) break;
    }
    console.log(JSON.stringify({ table, copied }));
};

for (const [table, conflictColumns] of TABLES) await copyTable(table, conflictColumns);
console.log('Supabase application data copied to Neon. Supabase Auth and Storage remain unchanged.');
