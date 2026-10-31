-- Applied only to the isolated evaluation branch during migration.
alter table public.agricultural_reference_images add column if not exists storage_key text;
