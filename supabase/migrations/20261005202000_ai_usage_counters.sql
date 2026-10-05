create table if not exists public.ai_usage_counters (
    identity_key text not null,
    window_date date not null,
    request_count integer not null default 0 check (request_count >= 0),
    updated_at timestamptz not null default now(),
    primary key (identity_key, window_date)
);
alter table public.ai_usage_counters enable row level security;
revoke all on public.ai_usage_counters from anon, authenticated;
grant select, insert, update, delete on public.ai_usage_counters to service_role;
