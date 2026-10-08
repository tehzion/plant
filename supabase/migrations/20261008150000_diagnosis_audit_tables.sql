-- Restore the server-only diagnosis audit tables used by data collection and pruning.
create table if not exists public.diagnosis_training_logs (
    id text primary key,
    created_at timestamptz not null default now(),
    category text,
    images jsonb not null default '{}'::jsonb,
    raw_result jsonb not null default '{}'::jsonb,
    metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.diagnosis_feedback (
    id uuid primary key default gen_random_uuid(),
    scan_id text not null,
    created_at timestamptz not null default now(),
    feedback jsonb not null
);

alter table public.diagnosis_training_logs enable row level security;
alter table public.diagnosis_feedback enable row level security;

revoke all on public.diagnosis_training_logs, public.diagnosis_feedback from anon, authenticated;
grant select, insert, update, delete on public.diagnosis_training_logs, public.diagnosis_feedback to service_role;

create index if not exists diagnosis_training_created_idx
    on public.diagnosis_training_logs(created_at);
create index if not exists diagnosis_feedback_scan_idx
    on public.diagnosis_feedback(scan_id, created_at);
create index if not exists diagnosis_feedback_created_idx
    on public.diagnosis_feedback(created_at);
