-- Apply only after review on an isolated Neon branch. No farmer tables are changed.
create table if not exists public.evaluation_cases (
    id text primary key check (id ~ '^[a-f0-9]{64}$'),
    image_id text not null,
    source text not null check (source in ('PlantVillage', 'PlantDoc')),
    workflow_version text not null,
    record jsonb not null,
    imported_by uuid not null,
    created_at timestamptz not null default now()
);
create index if not exists evaluation_cases_source_created_idx on public.evaluation_cases(source, created_at desc, id);
create table if not exists public.evaluation_reviews (
    id uuid primary key default gen_random_uuid(),
    case_id text not null references public.evaluation_cases(id) on delete restrict,
    reviewer_id uuid not null,
    verdict text not null check (verdict in ('agree','disagree','inconclusive','requires_evidence')),
    corrected_condition text not null default '',
    uncertainty text not null default '',
    follow_up text not null default '',
    comments text not null default '',
    created_at timestamptz not null default now()
);
create index if not exists evaluation_reviews_case_created_idx on public.evaluation_reviews(case_id, created_at desc);
create table if not exists public.evaluation_usability_sessions (
    id uuid primary key default gen_random_uuid(),
    participant_id text not null,
    consent boolean not null check (consent),
    test_date date not null,
    task text not null check (task in ('assessment','assistant','product','farm_activity')),
    completed boolean not null,
    duration_seconds integer check (duration_seconds >= 0 and duration_seconds <= 86400),
    assistance boolean not null,
    difficulty text not null default '',
    feedback text not null default '',
    observations text not null default '',
    recorded_by uuid not null,
    created_at timestamptz not null default now()
);
-- These are server-only tables. Do not grant browser roles access.
revoke all on public.evaluation_cases, public.evaluation_reviews, public.evaluation_usability_sessions from public;

create table if not exists public.evaluation_product_scenarios (
    id uuid primary key default gen_random_uuid(),
    scenario jsonb not null,
    recommendation jsonb not null,
    recorded_by uuid not null,
    created_at timestamptz not null default now()
);
create table if not exists public.evaluation_product_reviews (
    id uuid primary key default gen_random_uuid(),
    scenario_id uuid not null references public.evaluation_product_scenarios(id) on delete restrict,
    reviewer_id uuid not null,
    product_id text not null,
    verdict text not null check (verdict in ('suitable','unsuitable','requires_verification')),
    crop_compatibility text not null default '',
    product_purpose text not null default '',
    condition_relevance text not null default '',
    label_information text not null default '',
    restrictions text not null default '',
    missing_information text not null default '',
    unsupported_claims text not null default '',
    uncertainty text not null default '',
    comments text not null default '',
    created_at timestamptz not null default now()
);
revoke all on public.evaluation_product_scenarios, public.evaluation_product_reviews from public;
