-- KANB Plant app Supabase schema
-- Target project: Agropeuner (aweyluvuvydbwdanodqe)

create table if not exists public.profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    name text not null default '',
    contact text not null default '',
    crops text not null default '',
    member_since text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.scan_history (
    id text primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    disease text,
    confidence numeric,
    severity text,
    category text,
    scale text,
    location_name text,
    result_json jsonb not null default '{}'::jsonb,
    image_url text,
    leaf_image_url text,
    image_path text,
    leaf_image_path text,
    created_at timestamptz not null default now()
);

create table if not exists public.mygap_logs (
    id text primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    type text not null default 'pesticide',
    notes text not null default '',
    created_at timestamptz not null default now()
);

create table if not exists public.mygap_checklist (
    user_id uuid primary key references auth.users(id) on delete cascade,
    state jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

create table if not exists public.daily_notes (
    id text primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
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
    user_id uuid not null references auth.users(id) on delete cascade,
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
    user_id uuid references auth.users(id) on delete set null,
    guest_id text,
    order_id text not null,
    created_at timestamptz not null default now()
);

create table if not exists public.consultation_leads (
    id uuid primary key default gen_random_uuid(),
    scan_id text,
    user_id uuid references auth.users(id) on delete set null,
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

create index if not exists scan_history_user_id_created_at_idx on public.scan_history(user_id, created_at desc);
create index if not exists mygap_logs_user_id_created_at_idx on public.mygap_logs(user_id, created_at desc);
create index if not exists daily_notes_user_id_created_at_idx on public.daily_notes(user_id, created_at desc);
create index if not exists plots_user_id_created_at_idx on public.plots(user_id, created_at desc);
create index if not exists order_refs_user_id_created_at_idx on public.order_refs(user_id, created_at desc);
create index if not exists order_refs_guest_id_created_at_idx on public.order_refs(guest_id, created_at desc);
create index if not exists consultation_leads_created_at_idx on public.consultation_leads(created_at desc);
create index if not exists consultation_leads_user_id_created_at_idx on public.consultation_leads(user_id, created_at desc);
create index if not exists consultation_leads_scan_id_idx on public.consultation_leads(scan_id);
create index if not exists consultation_leads_guest_id_created_at_idx on public.consultation_leads(guest_id, created_at desc);
drop index if exists public.profiles_user_id_idx;
drop index if exists public.scan_history_user_created_idx;
drop index if exists public.mygap_logs_user_created_idx;
drop index if exists public.daily_notes_user_created_idx;
drop index if exists public.plots_user_created_idx;
drop index if exists public.disease_product_rules_enabled_priority_idx;
drop index if exists public.disease_product_rules_disease_aliases_idx;
drop index if exists public.disease_product_rules_crop_aliases_idx;

alter table public.profiles enable row level security;
alter table public.scan_history enable row level security;
alter table public.mygap_logs enable row level security;
alter table public.mygap_checklist enable row level security;
alter table public.daily_notes enable row level security;
alter table public.plots enable row level security;
alter table public.order_refs enable row level security;
alter table public.consultation_leads enable row level security;
alter table public.disease_product_rules enable row level security;

alter table public.scan_history add column if not exists image_path text;
alter table public.scan_history add column if not exists leaf_image_path text;
alter table public.daily_notes add column if not exists photo_path text;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.scan_history to authenticated;
grant select, insert, update, delete on public.mygap_logs to authenticated;
grant select, insert, update, delete on public.mygap_checklist to authenticated;
grant select, insert, update, delete on public.daily_notes to authenticated;
grant select, insert, update, delete on public.plots to authenticated;
grant select, insert, update, delete on public.order_refs to authenticated;
revoke all on public.consultation_leads from anon, authenticated;
grant insert on public.consultation_leads to anon, authenticated;
grant select, insert, update, delete on public.consultation_leads to service_role;
grant select on public.disease_product_rules to anon, authenticated;
grant select, insert, update, delete on public.disease_product_rules to service_role;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
    for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
    for delete to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "scan_history_select_own" on public.scan_history;
create policy "scan_history_select_own" on public.scan_history
    for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "scan_history_insert_own" on public.scan_history;
create policy "scan_history_insert_own" on public.scan_history
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "scan_history_update_own" on public.scan_history;
create policy "scan_history_update_own" on public.scan_history
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "scan_history_delete_own" on public.scan_history;
create policy "scan_history_delete_own" on public.scan_history
    for delete to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "mygap_logs_select_own" on public.mygap_logs;
create policy "mygap_logs_select_own" on public.mygap_logs
    for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "mygap_logs_insert_own" on public.mygap_logs;
create policy "mygap_logs_insert_own" on public.mygap_logs
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "mygap_logs_update_own" on public.mygap_logs;
create policy "mygap_logs_update_own" on public.mygap_logs
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "mygap_logs_delete_own" on public.mygap_logs;
create policy "mygap_logs_delete_own" on public.mygap_logs
    for delete to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "mygap_checklist_select_own" on public.mygap_checklist;
create policy "mygap_checklist_select_own" on public.mygap_checklist
    for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "mygap_checklist_insert_own" on public.mygap_checklist;
create policy "mygap_checklist_insert_own" on public.mygap_checklist
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "mygap_checklist_update_own" on public.mygap_checklist;
create policy "mygap_checklist_update_own" on public.mygap_checklist
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "mygap_checklist_delete_own" on public.mygap_checklist;
create policy "mygap_checklist_delete_own" on public.mygap_checklist
    for delete to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "daily_notes_select_own" on public.daily_notes;
create policy "daily_notes_select_own" on public.daily_notes
    for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "daily_notes_insert_own" on public.daily_notes;
create policy "daily_notes_insert_own" on public.daily_notes
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "daily_notes_update_own" on public.daily_notes;
create policy "daily_notes_update_own" on public.daily_notes
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "daily_notes_delete_own" on public.daily_notes;
create policy "daily_notes_delete_own" on public.daily_notes
    for delete to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "plots_select_own" on public.plots;
create policy "plots_select_own" on public.plots
    for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "plots_insert_own" on public.plots;
create policy "plots_insert_own" on public.plots
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "plots_update_own" on public.plots;
create policy "plots_update_own" on public.plots
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "plots_delete_own" on public.plots;
create policy "plots_delete_own" on public.plots
    for delete to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "order_refs_select_own" on public.order_refs;
create policy "order_refs_select_own" on public.order_refs
    for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "order_refs_insert_own" on public.order_refs;
create policy "order_refs_insert_own" on public.order_refs
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "order_refs_update_own" on public.order_refs;
create policy "order_refs_update_own" on public.order_refs
    for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "order_refs_delete_own" on public.order_refs;
create policy "order_refs_delete_own" on public.order_refs
    for delete to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "consultation_leads_insert_contact_intent" on public.consultation_leads;
create policy "consultation_leads_insert_contact_intent" on public.consultation_leads
    for insert to anon, authenticated
    with check (
        (user_id is null or (select auth.uid()) = user_id)
        and contact_intent = 'whatsapp_consultation'
        and phone = '+60136667810'
        and source in ('product_recommendations', 'results_consultation', 'catalog_error')
        and char_length(coalesce(scan_id, '')) <= 240
        and char_length(disease) <= 240
        and char_length(crop) <= 240
        and char_length(coalesce(guest_id, '')) <= 240
        and char_length(coalesce(recommendation_intent, '')) <= 80
    );

drop policy if exists "disease_product_rules_public_read_enabled" on public.disease_product_rules;
create policy "disease_product_rules_public_read_enabled" on public.disease_product_rules
    for select to anon, authenticated
    using (enabled = true);

insert into public.disease_product_rules (
    id,
    display_name,
    crop_aliases,
    disease_aliases,
    pathogen_types,
    product_tags,
    active_ingredients,
    recommendation_roles,
    caution,
    priority,
    enabled
) values
(
    'fungal_leaf_spot_anthracnose',
    'Fungal leaf spot / anthracnose',
    array['durian', 'mango', 'mangga', 'banana', 'pisang', 'papaya', 'betik', 'chilli', 'chili', 'cili'],
    array['leaf spot', 'fungal leaf spot', 'anthracnose', 'colletotrichum', 'black spot', 'fruit rot'],
    array['fungal', 'fungus'],
    array['fungicide', 'disease-control', 'leaf-spot', 'anthracnose', 'copper', 'mancozeb', 'chlorothalonil'],
    array['copper', 'mancozeb', 'chlorothalonil'],
    array['treatment'],
    'Use only crop-registered fungicides, rotate active ingredient groups, and follow the physical label rate before spraying.',
    10,
    true
),
(
    'phytophthora_bud_rot',
    'Phytophthora / bud rot',
    array['coconut', 'kelapa', 'durian', 'papaya', 'betik'],
    array['bud rot', 'phytophthora', 'root rot', 'stem rot', 'spear rot'],
    array['fungal', 'fungus', 'oomycete'],
    array['fungicide', 'disease-control', 'phytophthora', 'copper', 'phosphite', 'soil-treatment'],
    array['copper', 'potassium phosphite', 'phosphorous acid'],
    array['treatment'],
    'For bud rot or stem/root rot, remove infected tissue and consult urgently before relying on chemical treatment alone.',
    20,
    true
),
(
    'mealybug_scale_soft_pests',
    'Mealybug / scale insect',
    array['papaya', 'betik', 'citrus', 'limau', 'durian', 'chilli', 'chili', 'cili', 'mango', 'mangga'],
    array['mealybug', 'mealy bug', 'scale insect', 'soft scale', 'white scale', 'sap sucking pest'],
    array['pest', 'insect'],
    array['pest-control', 'insecticide', 'neem-oil', 'white-oil', 'mineral-oil', 'insecticidal-soap'],
    array['neem oil', 'mineral oil', 'insecticidal soap'],
    array['treatment'],
    'Confirm live pests under leaves and avoid broad-spectrum sprays during pollinator activity.',
    30,
    true
),
(
    'thrips_mites',
    'Thrips / mites',
    array['chilli', 'chili', 'cili', 'mango', 'mangga', 'papaya', 'betik', 'banana', 'pisang'],
    array['thrips', 'mite', 'mites', 'spider mite', 'silvering', 'leaf curling pest'],
    array['pest', 'insect', 'mite'],
    array['pest-control', 'insecticide', 'miticide', 'neem-oil', 'abamectin', 'sulfur'],
    array['neem oil', 'abamectin', 'sulfur'],
    array['treatment'],
    'Check pest presence with a hand lens and rotate modes of action to reduce resistance.',
    40,
    true
),
(
    'rice_blast',
    'Rice blast',
    array['padi', 'rice'],
    array['blast', 'rice blast', 'neck blast', 'leaf blast', 'pyricularia'],
    array['fungal', 'fungus'],
    array['fungicide', 'disease-control', 'rice-blast', 'blast', 'tricyclazole', 'azoxystrobin'],
    array['tricyclazole', 'azoxystrobin', 'isoprothiolane'],
    array['treatment'],
    'Confirm blast symptoms and follow local padi label restrictions, especially around heading stage.',
    50,
    true
),
(
    'bacterial_leaf_spot_blight',
    'Bacterial leaf spot / blight',
    array['chilli', 'chili', 'cili', 'rice', 'padi', 'mango', 'mangga', 'papaya', 'betik'],
    array['bacterial leaf spot', 'bacterial blight', 'leaf blight', 'xanthomonas', 'bacterial wilt'],
    array['bacterial', 'bacteria'],
    array['bactericide', 'copper', 'disease-control', 'sanitation', 'biofungicide'],
    array['copper', 'bacillus subtilis'],
    array['treatment'],
    'Bacterial problems need sanitation and spread control; copper products are preventive, not a cure for advanced infection.',
    60,
    true
),
(
    'nutrient_deficiency_support',
    'Nutrient deficiency support',
    array['durian', 'mango', 'mangga', 'banana', 'pisang', 'papaya', 'betik', 'chilli', 'chili', 'cili', 'padi', 'rice'],
    array['nutrient deficiency', 'deficiency', 'chlorosis', 'yellowing', 'potassium deficiency', 'magnesium deficiency', 'calcium deficiency'],
    array['nutrient', 'abiotic', 'physiological'],
    array['fertilizer', 'npk', 'trace-elements', 'magnesium', 'potassium', 'calcium', 'foliar-feed', 'micronutrient'],
    array['NPK', 'magnesium', 'potassium', 'calcium', 'trace elements'],
    array['fertilizer', 'supplement'],
    'Use soil or leaf testing where possible; nutrient products should not be presented as pest or disease cures.',
    70,
    true
)
on conflict (id) do update
set display_name = excluded.display_name,
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'scan-images',
    'scan-images',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "scan_images_public_read" on storage.objects;
drop policy if exists "scan_images_select_own_folder" on storage.objects;
create policy "scan_images_select_own_folder" on storage.objects
    for select to authenticated
    using (
        bucket_id = 'scan-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

drop policy if exists "scan_images_insert_own_folder" on storage.objects;
create policy "scan_images_insert_own_folder" on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'scan-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

drop policy if exists "scan_images_update_own_folder" on storage.objects;
create policy "scan_images_update_own_folder" on storage.objects
    for update to authenticated
    using (
        bucket_id = 'scan-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    )
    with check (
        bucket_id = 'scan-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

drop policy if exists "scan_images_delete_own_folder" on storage.objects;
create policy "scan_images_delete_own_folder" on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'scan-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );
