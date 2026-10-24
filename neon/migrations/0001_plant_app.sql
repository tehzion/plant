-- Plant AI application schema for Neon Postgres.
-- Supabase Auth and Storage remain external services. UUID user_id values are
-- opaque Supabase identities and ownership is enforced by the API layer.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
    user_id uuid primary key,
    name text not null default '',
    contact text not null default '',
    crops text not null default '',
    member_since text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.scan_history (
    id text primary key,
    user_id uuid not null,
    disease text,
    confidence numeric,
    severity text,
    category text,
    scale text,
    location_name text,
    plot_id text,
    result_json jsonb not null default '{}'::jsonb,
    image_url text,
    leaf_image_url text,
    image_path text,
    leaf_image_path text,
    created_at timestamptz not null default now(),
    revision integer not null default 0
);

create table if not exists public.mygap_logs (
    id text primary key,
    user_id uuid not null,
    type text not null default 'pesticide',
    notes text not null default '',
    created_at timestamptz not null default now()
);

create table if not exists public.mygap_checklist (
    user_id uuid primary key,
    state jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

create table if not exists public.daily_notes (
    id text primary key,
    user_id uuid not null,
    note text not null default '',
    activity_type text not null default 'note',
    plot_id text,
    chemical_name text,
    chemical_qty text,
    application_timing text,
    temperature_am numeric,
    humidity numeric,
    growth_stage text,
    pest_notes text,
    disease_incidence numeric,
    disease_name_observed text,
    scout_severity text,
    kg_harvested numeric,
    quality_grade text,
    price_per_kg numeric,
    buyer_name text,
    expense_amount numeric,
    expense_category text,
    pruned_count numeric,
    pruning_type text,
    inspection_type text,
    inspection_status text,
    photo_url text,
    photo_path text,
    created_at timestamptz not null default now()
);

create table if not exists public.plots (
    id text primary key,
    user_id uuid not null,
    name text not null default '',
    crop_type text not null default '',
    area numeric not null default 0,
    unit text not null default 'acres',
    soil_ph numeric,
    npk_n numeric,
    npk_p numeric,
    npk_k numeric,
    created_at timestamptz not null default now()
);

create table if not exists public.order_refs (
    id text primary key,
    user_id uuid,
    guest_id text,
    order_id text not null,
    created_at timestamptz not null default now()
);

create table if not exists public.order_recovery_requests (
    id uuid primary key default gen_random_uuid(),
    order_id text not null,
    requester_user_id uuid not null,
    explanation text not null default '',
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    reviewer_user_id uuid,
    reviewed_at timestamptz,
    verification_note text,
    created_at timestamptz not null default now()
);

create table if not exists public.consultation_leads (
    id uuid primary key default gen_random_uuid(),
    scan_id text,
    user_id uuid,
    guest_id text,
    disease text not null default '',
    crop text not null default '',
    confidence numeric,
    phone text not null default '+60136667810',
    contact_intent text not null default 'whatsapp_consultation',
    recommendation_intent text,
    severity text,
    status text,
    location_name text,
    source text not null default 'product_recommendations',
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists public.product_events (
    id uuid primary key default gen_random_uuid(),
    scan_id text,
    user_id uuid,
    guest_id text,
    event_type text not null default 'product_click',
    product_id text,
    product_name text not null default '',
    product_url text,
    recommendation_intent text,
    recommendation_role text,
    disease text not null default '',
    crop text not null default '',
    confidence numeric,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists public.disease_product_rules (
    id text primary key,
    display_name text not null,
    crop_aliases text[] not null default '{}',
    disease_aliases text[] not null default '{}',
    pathogen_types text[] not null default '{}',
    product_tags text[] not null default '{}',
    active_ingredients text[] not null default '{}',
    recommendation_roles text[] not null default array['treatment'],
    caution text not null default '',
    priority integer not null default 100,
    enabled boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

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

create table if not exists public.scan_followup_events (
    id uuid primary key,
    user_id uuid not null,
    scan_id text not null,
    plot_id text,
    outcome text not null check (outcome in ('pending', 'improving', 'unchanged', 'worsening', 'resolved')),
    severity text not null default '',
    note text not null default '',
    photo_path text,
    next_check_date date,
    recorded_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create table if not exists public.activity_revisions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    activity_id text not null,
    actor_user_id uuid,
    previous_values jsonb not null default '{}'::jsonb,
    new_values jsonb not null default '{}'::jsonb,
    correction_reason text not null default '',
    created_at timestamptz not null default now()
);

create table if not exists public.diagnosis_expert_labels (
    id uuid primary key default gen_random_uuid(),
    case_id text not null,
    reviewer_user_id uuid,
    crop text not null default '',
    organ text not null default '',
    diagnosis text not null default '',
    health_state text not null default '',
    cause_category text not null default '',
    approved_aliases jsonb not null default '[]'::jsonb,
    review_time_seconds integer,
    created_at timestamptz not null default now(),
    unique(case_id, reviewer_user_id)
);

create table if not exists public.ai_usage_counters (
    identity_key text not null,
    window_date date not null,
    request_count integer not null default 0 check (request_count >= 0),
    updated_at timestamptz not null default now(),
    primary key (identity_key, window_date)
);

create table if not exists public.ai_analysis_requests (
    identity_key text not null,
    scan_id text not null,
    status text not null default 'processing' check (status in ('processing')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (identity_key, scan_id)
);

create table if not exists public.neon_schema_migrations (
    version text primary key,
    applied_at timestamptz not null default now()
);

create index if not exists scan_history_user_id_created_at_idx on public.scan_history(user_id, created_at desc);
create index if not exists scan_history_user_plot_created_at_idx on public.scan_history(user_id, plot_id, created_at desc);
create index if not exists mygap_logs_user_id_created_at_idx on public.mygap_logs(user_id, created_at desc);
create index if not exists daily_notes_user_id_created_at_idx on public.daily_notes(user_id, created_at desc);
create index if not exists plots_user_id_created_at_idx on public.plots(user_id, created_at desc);
create index if not exists order_refs_user_id_created_at_idx on public.order_refs(user_id, created_at desc);
create index if not exists order_refs_guest_id_created_at_idx on public.order_refs(guest_id, created_at desc);
create unique index if not exists order_refs_order_id_unique_idx on public.order_refs(order_id);
create index if not exists order_recovery_requests_status_created_idx on public.order_recovery_requests(status, created_at desc);
create index if not exists consultation_leads_created_at_idx on public.consultation_leads(created_at desc);
create index if not exists consultation_leads_user_id_created_at_idx on public.consultation_leads(user_id, created_at desc);
create index if not exists consultation_leads_scan_id_idx on public.consultation_leads(scan_id);
create index if not exists product_events_created_at_idx on public.product_events(created_at desc);
create index if not exists product_events_user_id_created_at_idx on public.product_events(user_id, created_at desc);
create index if not exists product_events_scan_id_idx on public.product_events(scan_id);
create index if not exists product_events_event_type_created_at_idx on public.product_events(event_type, created_at desc);
create index if not exists diagnosis_training_created_idx on public.diagnosis_training_logs(created_at);
create index if not exists diagnosis_feedback_scan_idx on public.diagnosis_feedback(scan_id, created_at);
create index if not exists diagnosis_feedback_created_idx on public.diagnosis_feedback(created_at);
create index if not exists scan_followup_events_owner_scan_idx on public.scan_followup_events(user_id, scan_id, recorded_at);
create index if not exists ai_analysis_requests_updated_idx on public.ai_analysis_requests(updated_at);

create or replace function public.ensure_plot_belongs_to_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.plot_id is not null and not exists (
        select 1 from public.plots where id = new.plot_id and user_id = new.user_id
    ) then
        raise exception 'plot_id does not belong to user_id';
    end if;
    return new;
end;
$$;

drop trigger if exists scan_history_plot_owner_guard on public.scan_history;
create trigger scan_history_plot_owner_guard
before insert or update of plot_id, user_id on public.scan_history
for each row execute function public.ensure_plot_belongs_to_user();

drop trigger if exists daily_notes_plot_owner_guard on public.daily_notes;
create trigger daily_notes_plot_owner_guard
before insert or update of plot_id, user_id on public.daily_notes
for each row execute function public.ensure_plot_belongs_to_user();

drop trigger if exists scan_followup_events_plot_owner_guard on public.scan_followup_events;
create trigger scan_followup_events_plot_owner_guard
before insert or update of plot_id, user_id on public.scan_followup_events
for each row execute function public.ensure_plot_belongs_to_user();

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'scan_history_plot_id_fkey') then
        alter table public.scan_history add constraint scan_history_plot_id_fkey
            foreign key (plot_id) references public.plots(id) on delete set null;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'daily_notes_plot_id_fkey') then
        alter table public.daily_notes add constraint daily_notes_plot_id_fkey
            foreign key (plot_id) references public.plots(id) on delete set null;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'scan_followup_events_plot_id_fkey') then
        alter table public.scan_followup_events add constraint scan_followup_events_plot_id_fkey
            foreign key (plot_id) references public.plots(id) on delete set null;
    end if;
end;
$$;

insert into public.disease_product_rules (
    id, display_name, crop_aliases, disease_aliases, pathogen_types, product_tags,
    active_ingredients, recommendation_roles, caution, priority, enabled
) values
('fungal_leaf_spot_anthracnose', 'Fungal leaf spot / anthracnose',
 array['durian','mango','mangga','banana','pisang','papaya','betik','chilli','chili','cili'],
 array['leaf spot','fungal leaf spot','anthracnose','colletotrichum','black spot','fruit rot'],
 array['fungal','fungus'], array['fungicide','disease-control','leaf-spot','anthracnose','copper','mancozeb','chlorothalonil'],
 array['copper','mancozeb','chlorothalonil'], array['treatment'],
 'Use only crop-registered fungicides, rotate active ingredient groups, and follow the physical label rate before spraying.', 10, true),
('phytophthora_bud_rot', 'Phytophthora / bud rot',
 array['coconut','kelapa','durian','papaya','betik'],
 array['bud rot','phytophthora','root rot','stem rot','spear rot'],
 array['fungal','fungus','oomycete'], array['fungicide','disease-control','phytophthora','copper','phosphite','soil-treatment'],
 array['copper','potassium phosphite','phosphorous acid'], array['treatment'],
 'For bud rot or stem/root rot, remove infected tissue and consult urgently before relying on chemical treatment alone.', 20, true),
('coconut_leaf_spot_blight', 'Coconut leaf spot / blight',
 array['coconut','kelapa'], array['leaf spot','leaf blight','grey leaf spot','gray leaf spot','pestalotiopsis','helminthosporium'],
 array['fungal','fungus'], array['fungicide','disease-control','coconut','kelapa','leaf-spot','copper','mancozeb'],
 array['copper','mancozeb'], array['treatment'],
 'Confirm close-up leaf lesions before spraying; remove badly affected fronds and follow coconut label restrictions.', 22, true),
('banana_sigatoka_leaf_spot', 'Banana Sigatoka / leaf spot',
 array['banana','pisang'], array['sigatoka','yellow sigatoka','black sigatoka','banana leaf spot','leaf streak'],
 array['fungal','fungus'], array['fungicide','disease-control','banana','pisang','sigatoka','leaf-spot','mancozeb','copper'],
 array['mancozeb','copper','propiconazole'], array['treatment'],
 'Use crop-registered products only and rotate fungicide groups; remove heavily infected leaves to reduce pressure.', 24, true),
('chilli_anthracnose_fruit_rot', 'Chilli anthracnose / fruit rot',
 array['chilli','chili','cili'], array['anthracnose','fruit rot','ripe fruit rot','colletotrichum','black sunken lesion'],
 array['fungal','fungus'], array['fungicide','disease-control','chilli','cili','anthracnose','fruit-rot','copper','mancozeb','chlorothalonil'],
 array['copper','mancozeb','chlorothalonil'], array['treatment'],
 'Confirm fruit lesions and check pre-harvest intervals carefully before any chilli treatment.', 26, true),
('durian_phytophthora_canker', 'Durian Phytophthora canker',
 array['durian'], array['stem canker','trunk canker','phytophthora','gummosis','root rot','patch canker'],
 array['fungal','fungus','oomycete'], array['fungicide','disease-control','durian','phytophthora','phosphite','copper','soil-treatment'],
 array['potassium phosphite','phosphorous acid','copper'], array['treatment'],
 'Durian canker needs urgent field inspection, drainage correction, and label-verified treatment; do not rely on spray alone.', 28, true),
('mealybug_scale_soft_pests', 'Mealybug / scale insect',
 array['papaya','betik','citrus','limau','durian','chilli','chili','cili','mango','mangga'],
 array['mealybug','mealy bug','scale insect','soft scale','white scale','sap sucking pest'],
 array['pest','insect'], array['pest-control','insecticide','neem-oil','white-oil','mineral-oil','insecticidal-soap'],
 array['neem oil','mineral oil','insecticidal soap'], array['treatment'],
 'Confirm live pests under leaves and avoid broad-spectrum sprays during pollinator activity.', 30, true),
('thrips_mites', 'Thrips / mites',
 array['chilli','chili','cili','mango','mangga','papaya','betik','banana','pisang'],
 array['thrips','mite','mites','spider mite','silvering','leaf curling pest'],
 array['pest','insect','mite'], array['pest-control','insecticide','miticide','neem-oil','abamectin','sulfur'],
 array['neem oil','abamectin','sulfur'], array['treatment'],
 'Check pest presence with a hand lens and rotate modes of action to reduce resistance.', 40, true),
('rice_blast', 'Rice blast', array['padi','rice'], array['blast','rice blast','neck blast','leaf blast','pyricularia'],
 array['fungal','fungus'], array['fungicide','disease-control','rice-blast','blast','tricyclazole','azoxystrobin'],
 array['tricyclazole','azoxystrobin','isoprothiolane'], array['treatment'],
 'Confirm blast symptoms and follow local padi label restrictions, especially around heading stage.', 50, true),
('padi_bacterial_leaf_blight', 'Padi bacterial leaf blight', array['padi','rice'], array['bacterial leaf blight','kresek','xanthomonas','leaf blight'],
 array['bacterial','bacteria'], array['bactericide','disease-control','padi','rice','copper','biofungicide','sanitation'],
 array['copper','bacillus subtilis'], array['treatment'],
 'Bacterial blight management depends on resistant varieties, clean water flow, and sanitation; products are preventive support only.', 55, true),
('bacterial_leaf_spot_blight', 'Bacterial leaf spot / blight',
 array['chilli','chili','cili','rice','padi','mango','mangga','papaya','betik'],
 array['bacterial leaf spot','bacterial blight','leaf blight','xanthomonas','bacterial wilt'],
 array['bacterial','bacteria'], array['bactericide','copper','disease-control','sanitation','biofungicide'],
 array['copper','bacillus subtilis'], array['treatment'],
 'Bacterial problems need sanitation and spread control; copper products are preventive, not a cure for advanced infection.', 60, true),
('fruit_fly_trap_support', 'Fruit fly trap support',
 array['mango','mangga','papaya','betik','chilli','chili','cili','guava','jambu'],
 array['fruit fly','buah busuk berulat','maggot','puncture mark','fruit drop'],
 array['pest','insect'], array['pest-control','fruit-fly','trap','pheromone','methyl-eugenol','protein-bait','spinosad'],
 array['methyl eugenol','protein bait','spinosad'], array['treatment'],
 'Use traps and sanitation first; confirm fruit fly damage before applying bait or insecticide products.', 65, true),
('nutrient_deficiency_support', 'Nutrient deficiency support',
 array['durian','mango','mangga','banana','pisang','papaya','betik','chilli','chili','cili','padi','rice'],
 array['nutrient deficiency','deficiency','chlorosis','yellowing','potassium deficiency','magnesium deficiency','calcium deficiency'],
 array['nutrient','abiotic','physiological'], array['fertilizer','npk','trace-elements','magnesium','potassium','calcium','foliar-feed','micronutrient'],
 array['NPK','magnesium','potassium','calcium','trace elements'], array['fertilizer','supplement'],
 'Use soil or leaf testing where possible; nutrient products should not be presented as pest or disease cures.', 70, true)
on conflict (id) do update set
 display_name = excluded.display_name,
 crop_aliases = excluded.crop_aliases,
 disease_aliases = excluded.disease_aliases,
 pathogen_types = excluded.pathogen_types,
 product_tags = excluded.product_tags,
 active_ingredients = excluded.active_ingredients,
 recommendation_roles = excluded.recommendation_roles,
 caution = excluded.caution,
 priority = excluded.priority,
 enabled = excluded.enabled,
 updated_at = now();

insert into public.neon_schema_migrations(version)
values ('0001_plant_app')
on conflict (version) do nothing;
