-- Additive migration for store-verified guest-order recovery.
create table if not exists public.order_recovery_requests (
    id uuid primary key default gen_random_uuid(),
    order_id text not null,
    requester_user_id uuid not null references auth.users(id) on delete cascade,
    explanation text not null default '',
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    reviewer_user_id uuid references auth.users(id) on delete set null,
    reviewed_at timestamptz,
    verification_note text,
    created_at timestamptz not null default now()
);

create index if not exists order_recovery_requests_status_created_idx
    on public.order_recovery_requests(status, created_at desc);
create unique index if not exists order_refs_order_id_unique_idx
    on public.order_refs(order_id);

alter table public.order_recovery_requests enable row level security;
revoke all on public.order_recovery_requests from anon, authenticated;
revoke insert, update, delete on public.order_refs from authenticated;
grant select, insert, update, delete on public.order_refs to service_role;
