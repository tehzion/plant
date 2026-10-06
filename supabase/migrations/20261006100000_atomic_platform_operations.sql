-- Atomic server-side operations used by quota, analysis idempotency,
-- follow-up saves, guest migration, and order recovery.

create table if not exists public.ai_analysis_requests (
    identity_key text not null,
    scan_id text not null,
    status text not null default 'processing' check (status in ('processing')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (identity_key, scan_id)
);

alter table public.ai_analysis_requests enable row level security;
revoke all on public.ai_analysis_requests from anon, authenticated;
grant select, insert, update, delete on public.ai_analysis_requests to service_role;

create index if not exists ai_analysis_requests_updated_idx
    on public.ai_analysis_requests(updated_at);

create index if not exists scan_history_owner_cursor_idx
    on public.scan_history(user_id, created_at desc, id desc);

create index if not exists daily_notes_owner_cursor_idx
    on public.daily_notes(user_id, created_at desc, id desc);

create index if not exists scan_followup_events_owner_cursor_idx
    on public.scan_followup_events(user_id, scan_id, recorded_at desc, id desc);

create or replace function public.consume_ai_quota(
    p_identity_key text,
    p_window_date date,
    p_limit integer
)
returns table(allowed boolean, used integer, quota_limit integer)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_used integer;
    v_limit integer := greatest(coalesce(p_limit, 0), 0);
begin
    if nullif(trim(p_identity_key), '') is null then
        raise exception 'identity key is required' using errcode = '22023';
    end if;

    insert into public.ai_usage_counters(identity_key, window_date, request_count, updated_at)
    values (p_identity_key, coalesce(p_window_date, current_date), 1, now())
    on conflict (identity_key, window_date) do update
        set request_count = public.ai_usage_counters.request_count + 1,
            updated_at = now()
    returning request_count into v_used;

    return query select v_used <= v_limit, v_used, v_limit;
end;
$$;

create or replace function public.claim_ai_analysis(
    p_identity_key text,
    p_scan_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_claimed boolean;
begin
    if nullif(trim(p_identity_key), '') is null or nullif(trim(p_scan_id), '') is null then
        return false;
    end if;

    insert into public.ai_analysis_requests(identity_key, scan_id, status, created_at, updated_at)
    values (p_identity_key, p_scan_id, 'processing', now(), now())
    on conflict (identity_key, scan_id) do update
        set status = 'processing', updated_at = now()
        where public.ai_analysis_requests.updated_at < now() - interval '10 minutes'
    returning true into v_claimed;

    return coalesce(v_claimed, false);
end;
$$;

create or replace function public.release_ai_analysis(
    p_identity_key text,
    p_scan_id text
)
returns void
language sql
security definer
set search_path = public
as $$
    delete from public.ai_analysis_requests
    where identity_key = p_identity_key and scan_id = p_scan_id;
$$;

create or replace function public.create_followup_event(
    p_user_id uuid,
    p_scan_id text,
    p_expected_revision integer,
    p_event jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_scan public.scan_history%rowtype;
    v_existing public.scan_followup_events%rowtype;
    v_event public.scan_followup_events%rowtype;
    v_history jsonb;
    v_follow_up jsonb;
    v_next_result jsonb;
    v_event_id uuid;
    v_revision integer;
begin
    v_event_id := (p_event->>'id')::uuid;

    select * into v_existing
    from public.scan_followup_events
    where id = v_event_id
    for update;

    if found then
        if v_existing.user_id <> p_user_id or v_existing.scan_id <> p_scan_id then
            raise exception 'Follow-up event belongs to another scan' using errcode = '42501';
        end if;
        select revision, result_json into v_revision, v_next_result
        from public.scan_history where id = p_scan_id and user_id = p_user_id;
        return jsonb_build_object(
            'event', to_jsonb(v_existing),
            'revision', coalesce(v_revision, 0),
            'followUp', coalesce(v_next_result->'followUp', '{}'::jsonb),
            'duplicate', true
        );
    end if;

    select * into v_scan
    from public.scan_history
    where id = p_scan_id and user_id = p_user_id
    for update;

    if not found then
        raise exception 'Scan not found' using errcode = 'P0002';
    end if;
    if coalesce(v_scan.revision, 0) <> coalesce(p_expected_revision, 0) then
        raise exception 'The scan changed in another session' using errcode = '40001';
    end if;

    insert into public.scan_followup_events(
        id, user_id, scan_id, plot_id, outcome, severity, note,
        photo_path, next_check_date, recorded_at
    ) values (
        v_event_id,
        p_user_id,
        p_scan_id,
        nullif(p_event->>'plot_id', ''),
        coalesce(nullif(p_event->>'outcome', ''), 'pending'),
        coalesce(p_event->>'severity', ''),
        left(coalesce(p_event->>'note', ''), 2000),
        nullif(p_event->>'photo_path', ''),
        nullif(p_event->>'next_check_date', '')::date,
        coalesce(nullif(p_event->>'recorded_at', '')::timestamptz, now())
    ) returning * into v_event;

    v_history := coalesce(v_scan.result_json->'followUp'->'history', '[]'::jsonb)
        || jsonb_build_array(jsonb_build_object(
            'id', v_event.id,
            'recordedAt', v_event.recorded_at,
            'outcome', v_event.outcome,
            'severity', v_event.severity,
            'note', v_event.note,
            'photoPath', v_event.photo_path
        ));
    v_follow_up := jsonb_build_object(
        'nextCheckDate', coalesce(v_event.next_check_date::text, ''),
        'history', v_history
    );
    v_next_result := coalesce(v_scan.result_json, '{}'::jsonb)
        || jsonb_build_object('plot_id', v_event.plot_id, 'followUp', v_follow_up);

    update public.scan_history
    set result_json = v_next_result,
        revision = coalesce(v_scan.revision, 0) + 1
    where id = p_scan_id and user_id = p_user_id;

    return jsonb_build_object(
        'event', to_jsonb(v_event),
        'revision', coalesce(v_scan.revision, 0) + 1,
        'followUp', v_follow_up,
        'duplicate', false
    );
end;
$$;

create or replace function public.approve_order_recovery(
    p_request_id uuid,
    p_reviewer_user_id uuid,
    p_decision text,
    p_verification_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_request public.order_recovery_requests%rowtype;
    v_ref public.order_refs%rowtype;
begin
    if p_decision not in ('approved', 'rejected') or nullif(trim(p_verification_note), '') is null then
        raise exception 'A decision and verification note are required' using errcode = '22023';
    end if;

    select * into v_request
    from public.order_recovery_requests
    where id = p_request_id and status = 'pending'
    for update;
    if not found then
        raise exception 'Recovery request is not pending' using errcode = 'P0002';
    end if;

    if p_decision = 'approved' then
        select * into v_ref
        from public.order_refs
        where order_id = v_request.order_id
        for update;
        if found then
            if v_ref.user_id is not null and v_ref.user_id <> v_request.requester_user_id then
                raise exception 'This order already belongs to another account' using errcode = '23505';
            end if;
            update public.order_refs
            set user_id = v_request.requester_user_id, guest_id = null
            where id = v_ref.id;
        else
            insert into public.order_refs(id, order_id, user_id, guest_id)
            values ('recovered-' || v_request.order_id, v_request.order_id, v_request.requester_user_id, null);
        end if;
    end if;

    update public.order_recovery_requests
    set status = p_decision,
        reviewer_user_id = p_reviewer_user_id,
        reviewed_at = now(),
        verification_note = left(p_verification_note, 1000)
    where id = v_request.id;

    return jsonb_build_object('status', p_decision, 'orderId', v_request.order_id);
end;
$$;

revoke all on function public.consume_ai_quota(text, date, integer) from public, anon, authenticated;
revoke all on function public.claim_ai_analysis(text, text) from public, anon, authenticated;
revoke all on function public.release_ai_analysis(text, text) from public, anon, authenticated;
revoke all on function public.create_followup_event(uuid, text, integer, jsonb) from public, anon, authenticated;
revoke all on function public.approve_order_recovery(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(text, date, integer) to service_role;
grant execute on function public.claim_ai_analysis(text, text) to service_role;
grant execute on function public.release_ai_analysis(text, text) to service_role;
grant execute on function public.create_followup_event(uuid, text, integer, jsonb) to service_role;
grant execute on function public.approve_order_recovery(uuid, uuid, text, text) to service_role;
