-- Evaluation-only migration. Apply to an isolated development branch, never automatically to production.
create table if not exists public.agricultural_reference_images (
  checksum text primary key check (checksum ~ '^[a-f0-9]{64}$'),
  source text not null check (source in ('PlantVillage', 'PlantDoc')),
  original_id text not null,
  crop text not null,
  original_label text not null,
  filename text not null,
  metadata jsonb not null,
  created_at timestamptz not null default now(),
  unique(source, original_id)
);
create table if not exists public.agricultural_dataset_assessments (
  id text primary key,
  image_checksum text not null references public.agricultural_reference_images(checksum),
  run_id text not null,
  predicted_crop text,
  predicted_condition text,
  health_status text,
  agreement text not null,
  completed boolean not null,
  duration_ms integer,
  evaluated_at timestamptz,
  response jsonb,
  unique(image_checksum, run_id)
);
create index if not exists agricultural_assessments_image_idx on public.agricultural_dataset_assessments(image_checksum, evaluated_at desc);
revoke all on public.agricultural_reference_images, public.agricultural_dataset_assessments from public;
