create table if not exists public.scan_followup_events (
    id uuid primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    scan_id text not null,
    plot_id text,
    outcome text not null check (outcome in ('pending', 'improving', 'unchanged', 'worsening', 'resolved')),
    severity text not null default '', note text not null default '', photo_path text,
    next_check_date date, recorded_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index if not exists scan_followup_events_owner_scan_idx on public.scan_followup_events(user_id, scan_id, recorded_at);
alter table public.scan_followup_events enable row level security;
revoke all on public.scan_followup_events from anon, authenticated;
grant select, insert, update, delete on public.scan_followup_events to service_role;

create table if not exists public.activity_revisions (
    id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
    activity_id text not null, actor_user_id uuid references auth.users(id) on delete set null,
    previous_values jsonb not null default '{}'::jsonb, new_values jsonb not null default '{}'::jsonb,
    correction_reason text not null default '', created_at timestamptz not null default now()
);
alter table public.activity_revisions enable row level security;
revoke all on public.activity_revisions from anon, authenticated;
grant select, insert on public.activity_revisions to service_role;

create table if not exists public.diagnosis_expert_labels (
    id uuid primary key default gen_random_uuid(), case_id text not null,
    reviewer_user_id uuid references auth.users(id) on delete set null, crop text not null default '', organ text not null default '',
    diagnosis text not null default '', health_state text not null default '', cause_category text not null default '',
    approved_aliases jsonb not null default '[]'::jsonb, review_time_seconds integer, created_at timestamptz not null default now(),
    unique(case_id, reviewer_user_id)
);
alter table public.diagnosis_expert_labels enable row level security;
revoke all on public.diagnosis_expert_labels from anon, authenticated;
grant select, insert, update, delete on public.diagnosis_expert_labels to service_role;
