-- 0003: myGAP pesticide record fields (myGAP 4-5) and correction tracking.
-- Additive only: no existing column, row or constraint is changed or dropped.
-- Safe to apply before or after the application release that uses it; until it
-- runs, the server folds these values into the record's notes.

-- Pesticide use record fields from the official myGAP 4-5 form. Values are
-- recorded as the farmer entered them from the product label.
alter table public.mygap_logs add column if not exists active_ingredient text;
alter table public.mygap_logs add column if not exists registration_no text;
alter table public.mygap_logs add column if not exists area_treated text;
alter table public.mygap_logs add column if not exists target_pest text;
-- Pre-harvest interval (tempoh menunggu sebelum tuai) from the label, in days.
alter table public.mygap_logs add column if not exists phi_days integer;
-- The plant scan that prompted this action, when there was one.
alter table public.mygap_logs add column if not exists linked_scan_id text;
-- Set when a record is corrected; each correction is kept in activity_revisions.
alter table public.mygap_logs add column if not exists updated_at timestamptz;

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'mygap_logs_phi_days_range') then
        alter table public.mygap_logs add constraint mygap_logs_phi_days_range check (phi_days is null or (phi_days >= 0 and phi_days <= 3650));
    end if;
end $$;

create index if not exists activity_revisions_user_activity_idx on public.activity_revisions(user_id, activity_id, created_at desc);
