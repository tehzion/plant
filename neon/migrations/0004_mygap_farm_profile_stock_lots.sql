-- 0004: myGAP Phase 2 — farm profile, input purchases and stock, harvest lots
-- and sales, worker training and post-harvest treatment records.
-- Additive only: no existing column, row or constraint is changed or dropped.

-- Farm profile used on the myGAP report and for the certificate renewal reminder.
alter table public.profiles add column if not exists farm_name text;
alter table public.profiles add column if not exists farm_address text;
alter table public.profiles add column if not exists land_tenure text;
alter table public.profiles add column if not exists mygap_ref text;
alter table public.profiles add column if not exists cert_expiry date;
-- Workers (myGAP 4-9): [{ id, name, idNumber, nationality, role }].
alter table public.profiles add column if not exists workers jsonb not null default '[]'::jsonb;

-- Structured amounts let the app keep an input stock list:
-- purchases add to stock, pesticide and fertilizer applications use it up.
alter table public.mygap_logs add column if not exists amount numeric;
alter table public.mygap_logs add column if not exists unit text;
-- Purchases: where the input was bought and what it cost.
alter table public.mygap_logs add column if not exists supplier text;
alter table public.mygap_logs add column if not exists price text;
-- Harvest and sales (myGAP 4-7): buyer and a lot code for traceability.
alter table public.mygap_logs add column if not exists buyer text;
alter table public.mygap_logs add column if not exists lot_code text;
-- Worker training (myGAP 4-9): topic and who attended.
alter table public.mygap_logs add column if not exists topic text;
alter table public.mygap_logs add column if not exists attendees text;

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'mygap_logs_amount_non_negative') then
        alter table public.mygap_logs add constraint mygap_logs_amount_non_negative check (amount is null or amount >= 0);
    end if;
end $$;

create index if not exists mygap_logs_user_lot_code_idx on public.mygap_logs(user_id, lot_code) where lot_code is not null;
