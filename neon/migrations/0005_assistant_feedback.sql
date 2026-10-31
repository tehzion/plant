-- Thumbs up/down on floating-assistant answers. Holds the question and the
-- answer the farmer rated, with no account or device identity.
create table if not exists public.assistant_feedback (
    id uuid primary key default gen_random_uuid(),
    rating text not null check (rating in ('up', 'down')),
    language text not null default 'en',
    question text not null default '',
    answer text not null,
    page text,
    scan_status text,
    created_at timestamptz not null default now()
);

create index if not exists assistant_feedback_created_idx on public.assistant_feedback(created_at desc);
create index if not exists assistant_feedback_rating_created_idx on public.assistant_feedback(rating, created_at desc);
