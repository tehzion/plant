-- Atomic optimistic-concurrency guard for follow-up edits.
alter table public.scan_history add column if not exists revision integer not null default 0;
create index if not exists scan_history_id_revision_idx on public.scan_history(id, revision);
