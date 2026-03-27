// ─── Supabase client ──────────────────────────────────────────────────────────
// SUPABASE IS CURRENTLY DISABLED.
// All data is stored in localStorage (guest/demo mode).
// To re-enable Supabase, comment out the null export below and
// uncomment the createClient block.
// ─────────────────────────────────────────────────────────────────────────────

// import { createClient } from '@supabase/supabase-js';

// const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// export const supabase = (supabaseUrl && supabaseAnonKey)
//     ? createClient(supabaseUrl, supabaseAnonKey, {
//         auth: { persistSession: true, autoRefreshToken: true },
//     })
//     : null;

export const supabase = null;
