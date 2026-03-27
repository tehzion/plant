import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Missing credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabase() {
  console.log('Testing Supabase Connection...');
  
  // 1. Check Auth (Sign in with a fake email to see if auth service is up)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'fake_test_email@example.com',
    password: 'fakepassword123',
  });
  
  // We EXPECT an "Invalid login credentials" error. 
  // If we get "FetchError: Failed to fetch", the URL is wrong.
  if (authError && authError.message.includes('fetch')) {
      console.log('❌ Auth Service Connection Failed:', authError.message);
  } else {
      console.log('✅ Auth Service Connection: OK (Endpoint is reachable)');
  }

  // 2. Check Database Tables (Check if we can query the 'users' or 'scan_history' table)
  // We might get a Row Level Security (RLS) error if we aren't logged in, but that still proves the DB is connected!
  const tablesToTest = ['scan_history', 'checklist_state', 'farm_plots', 'daily_logbook', 'daily_notes'];
  
  console.log('\nTesting Table Access (RLS might block reads, which is expected and fine, as long as the table exists):');
  
  for (const table of tablesToTest) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
          if (error.code === '42P01') {
              console.log(`❌ Table missing: ${table} (Code 42P01)`);
          } else if (error.code === 'PGRST301' || error.message.includes('RLS') || error.message.includes('row-level security')) {
              console.log(`🔒 Table exists (RLS blocked read, which is correct for anon): ${table}`);
          } else if (error.code === '22P02') {
             console.log(`✅ Table exists (UUID cast error, normal for empty query): ${table}`);
          } else {
              console.log(`⚠️ Table ${table} error: ${error.message} (Code: ${error.code})`);
              // Sometimes empty result with no error is successful RLS block returning 0 rows
          }
      } else {
          console.log(`✅ Table exists and is readable: ${table}`);
      }
  }
}

checkDatabase();
