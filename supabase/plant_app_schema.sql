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

create index if not exists scan_history_user_id_created_at_idx on public.scan_history(user_id, created_at desc);
create index if not exists mygap_logs_user_id_created_at_idx on public.mygap_logs(user_id, created_at desc);
create index if not exists daily_notes_user_id_created_at_idx on public.daily_notes(user_id, created_at desc);
create index if not exists plots_user_id_created_at_idx on public.plots(user_id, created_at desc);
create index if not exists order_refs_user_id_created_at_idx on public.order_refs(user_id, created_at desc);
create index if not exists order_refs_guest_id_created_at_idx on public.order_refs(guest_id, created_at desc);

drop index if exists public.profiles_user_id_idx;
drop index if exists public.scan_history_user_created_idx;
drop index if exists public.mygap_logs_user_created_idx;
drop index if exists public.daily_notes_user_created_idx;
drop index if exists public.plots_user_created_idx;

alter table public.profiles enable row level security;
alter table public.scan_history enable row level security;
alter table public.mygap_logs enable row level security;
alter table public.mygap_checklist enable row level security;
alter table public.daily_notes enable row level security;
alter table public.plots enable row level security;
alter table public.order_refs enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.scan_history to authenticated;
grant select, insert, update, delete on public.mygap_logs to authenticated;
grant select, insert, update, delete on public.mygap_checklist to authenticated;
grant select, insert, update, delete on public.daily_notes to authenticated;
grant select, insert, update, delete on public.plots to authenticated;
grant select, insert, update, delete on public.order_refs to authenticated;

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'scan-images',
    'scan-images',
    true,
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
