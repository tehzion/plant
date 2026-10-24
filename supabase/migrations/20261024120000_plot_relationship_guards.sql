-- Prevent new orphaned plot references without rewriting existing production data.
-- These foreign keys are intentionally NOT VALID so an operator can inspect and
-- repair historical rows before running VALIDATE CONSTRAINT explicitly.

do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'scan_history_plot_id_fkey'
    ) then
        alter table public.scan_history
            add constraint scan_history_plot_id_fkey
            foreign key (plot_id) references public.plots(id)
            on delete set null not valid;
    end if;

    if not exists (
        select 1 from pg_constraint where conname = 'daily_notes_plot_id_fkey'
    ) then
        alter table public.daily_notes
            add constraint daily_notes_plot_id_fkey
            foreign key (plot_id) references public.plots(id)
            on delete set null not valid;
    end if;

    if not exists (
        select 1 from pg_constraint where conname = 'scan_followup_events_plot_id_fkey'
    ) then
        alter table public.scan_followup_events
            add constraint scan_followup_events_plot_id_fkey
            foreign key (plot_id) references public.plots(id)
            on delete set null not valid;
    end if;
end;
$$;

create or replace function public.ensure_plot_belongs_to_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.plot_id is not null and not exists (
        select 1
        from public.plots
        where id = new.plot_id
          and user_id = new.user_id
    ) then
        raise exception 'plot_id does not belong to user_id';
    end if;
    return new;
end;
$$;

drop trigger if exists scan_history_plot_owner_guard on public.scan_history;
create trigger scan_history_plot_owner_guard
before insert or update of plot_id, user_id on public.scan_history
for each row execute function public.ensure_plot_belongs_to_user();

drop trigger if exists daily_notes_plot_owner_guard on public.daily_notes;
create trigger daily_notes_plot_owner_guard
before insert or update of plot_id, user_id on public.daily_notes
for each row execute function public.ensure_plot_belongs_to_user();

drop trigger if exists scan_followup_events_plot_owner_guard on public.scan_followup_events;
create trigger scan_followup_events_plot_owner_guard
before insert or update of plot_id, user_id on public.scan_followup_events
for each row execute function public.ensure_plot_belongs_to_user();

revoke execute on function public.ensure_plot_belongs_to_user() from anon, authenticated;

