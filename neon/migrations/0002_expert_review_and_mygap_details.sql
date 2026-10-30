-- 0002: structured myGAP record fields and the expert review workflow.
-- Additive only: no existing column, row or constraint is changed or dropped.
-- Review before applying; this file is NOT applied automatically.

-- myGAP logbook completeness. Quantity is free text recorded by the farmer;
-- the application never calculates chemical dosages.
alter table public.mygap_logs add column if not exists activity_date date;
alter table public.mygap_logs add column if not exists plot_id text;
alter table public.mygap_logs add column if not exists crop text;
alter table public.mygap_logs add column if not exists product_used text;
alter table public.mygap_logs add column if not exists quantity text;
alter table public.mygap_logs add column if not exists operator text;
create index if not exists mygap_logs_user_activity_date_idx on public.mygap_logs(user_id, activity_date desc);

-- Expert reviews are stored separately from both the original AI assessment
-- (diagnosis_training_logs, never modified) and farmer feedback
-- (diagnosis_feedback). Each review is an insert-only record with reviewer
-- attribution, so the full correction history is preserved.
create table if not exists public.diagnosis_expert_reviews (
    id uuid primary key default gen_random_uuid(),
    scan_id text not null,
    reviewer_user_id uuid not null,
    reviewer_email text not null,
    verdict text not null check (verdict in ('confirmed', 'corrected', 'uncertain')),
    corrected_crop text,
    corrected_diagnosis text,
    corrected_category text,
    notes text not null default '',
    flagged_uncertain boolean not null default false,
    product_reviews jsonb not null default '[]'::jsonb,
    ai_snapshot jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    constraint diagnosis_expert_reviews_correction_check
        check (verdict <> 'corrected' or coalesce(nullif(trim(corrected_diagnosis), ''), nullif(trim(corrected_crop), '')) is not null)
);

create index if not exists diagnosis_expert_reviews_scan_idx on public.diagnosis_expert_reviews(scan_id, created_at desc);
create index if not exists diagnosis_expert_reviews_created_idx on public.diagnosis_expert_reviews(created_at desc);
create index if not exists diagnosis_training_logs_owner_idx on public.diagnosis_training_logs((metadata->>'ownerHash'));

insert into public.neon_schema_migrations(version)
values ('0002_expert_review_and_mygap_details')
on conflict (version) do nothing;
