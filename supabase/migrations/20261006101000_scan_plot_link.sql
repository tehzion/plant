alter table public.scan_history add column if not exists plot_id text;
create index if not exists scan_history_user_plot_created_at_idx
    on public.scan_history(user_id, plot_id, created_at desc);
