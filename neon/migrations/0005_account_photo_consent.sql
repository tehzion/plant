-- Additive; apply only after owner approval. Existing accounts remain opted out.
alter table public.profiles add column if not exists data_consent jsonb;
