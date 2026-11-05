-- SMCS, audit log for the Digital Bulletin: the admin-only "Logs" screen on
-- /manage/logs. Records who changed what, and when, for everything staff can
-- change from /manage and /manage/health.
--
-- HOW IT WORKS
-- Every audited table gets one AFTER trigger ("audit_log") that calls the same
-- function, public.audit_log_change(). Postgres runs it for every inserted,
-- updated, or deleted row, whoever made the change: the manage page, the
-- info-content server route, a future automation, or someone in the Supabase
-- dashboard. It runs inside the same transaction as the change, so a save that
-- rolls back takes its log entry with it. Nothing in the app calls it.
--
-- A logging failure never blocks a save: the trigger body is wrapped in its
-- own BEGIN ... EXCEPTION block, so if building the entry fails Postgres undoes
-- only that step, raises a WARNING, and the real write carries on.
--
-- WHO MADE THE CHANGE
--   * Signed-in user (auth.uid() is set): source 'user', actor_name is their
--     profile full_name, else their email.
--   * No auth.uid() (service-role key, pg_cron, SQL Editor, Table Editor):
--     source 'automated'. actor_name is the transaction-local setting
--     app.actor_label when present, else 'Direct database edit'.
--
--   >>> AUTOMATIONS MUST ALWAYS LABEL THEMSELVES. <<<
--   Any job that writes to an audited table without a signed-in user (a cron
--   job, an Edge Function using the service-role key, a script) must run, in
--   the same transaction as its writes:
--       select set_config('app.actor_label', 'Bed count automation', true);
--   Without it the entry reads "Direct database edit", which is reserved for a
--   person editing in the Supabase dashboard or SQL Editor. Over PostgREST,
--   wrap the writes in an RPC that calls set_config first, since each REST
--   request is its own transaction.
--
-- WHAT IS DELIBERATELY NOT LOGGED (noise)
--   * Updates where only bookkeeping columns changed: updated_at everywhere,
--     bed_availability.updated_by, and the screens heartbeat columns
--     (last_seen, last_content_sync, build_version). Screen heartbeats are
--     never logged.
--   * A bed "Update" that rewrites a count with the same number.
--   * Removing lost & found rows that had already expired (the purge).
--   * Location-targeting rows deleted only because their slide or services
--     page was deleted (the slide or page deletion is logged instead).
--   * A drag-reorder rewrites `position` on every slide as separate requests;
--     only the first lands, as one "Reordered custom slides" per person per
--     10 seconds.
--   * Image files uploaded to Storage: an image swap is logged through the
--     slides.image_path change it is saved with. A file picked and then
--     abandoned changes nothing on screen and is not logged.
--
-- ACCESS
-- Admins can SELECT (same check as the admin panel: current_user_role() =
-- 'admin'). Nobody can insert, update, or delete through the API; entries are
-- written only by the SECURITY DEFINER trigger, and old ones removed only by
-- the 180-day purge below. The log is append-only.
--
-- RETENTION
-- Rows older than 180 days are deleted each time an admin opens the Logs
-- screen (mark_audit_logs_seen), so nothing depends on pg_cron. An optional
-- nightly schedule is at the bottom.
--
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. DEV PROJECT FIRST,
-- then production BEFORE deploying the code that reads audit_logs. Run after
-- 0033. Safe to re-run.


-- 1) The table ---------------------------------------------------------------
create table if not exists public.audit_logs (
  id             bigint generated always as identity primary key,
  created_at     timestamptz not null default now(),
  actor_id       uuid,          -- no foreign key, so entries outlive deleted users
  actor_name     text not null, -- snapshot at the time of the change
  source         text not null check (source in ('user', 'automated')),
  action         text not null check (action in ('insert', 'update', 'delete')),
  category       text not null, -- 'Custom slides', 'Bed counts', ... (filter)
  table_name     text not null,
  record_id      text,          -- text: bed ids are text; link rows are "a:b"
  summary        text not null,
  old_data       jsonb,         -- updates: only the changed columns
  new_data       jsonb,
  changed_fields text[] not null default '{}'
);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

-- Where each admin last opened the Logs screen, for the unread badge.
alter table public.profiles
  add column if not exists logs_last_seen_at timestamptz;


-- 2) Access ------------------------------------------------------------------
alter table public.audit_logs enable row level security;

drop policy if exists "Admins read audit logs" on public.audit_logs;
create policy "Admins read audit logs"
  on public.audit_logs for select
  to authenticated
  using (public.current_user_role() = 'admin');

-- Append-only from the outside: no write grants for any API role.
revoke all on public.audit_logs from anon;
revoke insert, update, delete, truncate on public.audit_logs from authenticated, service_role;
grant select on public.audit_logs to authenticated;


-- 3) Small helpers -----------------------------------------------------------
-- Readers never trust jsonb shapes: a malformed value becomes empty, not an
-- error.
create or replace function public.audit_jarr(j jsonb)
returns jsonb language sql immutable set search_path = public as $$
  select case when jsonb_typeof(j) = 'array' then j else '[]'::jsonb end;
$$;

create or replace function public.audit_jobj(j jsonb)
returns jsonb language sql immutable set search_path = public as $$
  select case when jsonb_typeof(j) = 'object' then j else '{}'::jsonb end;
$$;

create or replace function public.audit_text_array(j jsonb)
returns text[] language sql immutable set search_path = public as $$
  select array(select jsonb_array_elements_text(public.audit_jarr(j)));
$$;

-- The listed keys of a row, as an object.
create or replace function public.audit_pick(j jsonb, keys text[])
returns jsonb language sql immutable set search_path = public as $$
  select coalesce(jsonb_object_agg(k, j -> k), '{}'::jsonb)
  from unnest(keys) as k
  where j ? k;
$$;

-- Columns whose value really changed on an UPDATE, minus bookkeeping columns.
-- Empty for inserts and deletes.
create or replace function public.audit_changed_fields(p_table text, p_old jsonb, p_new jsonb)
returns text[] language sql immutable set search_path = public as $$
  select case
    when p_old is null or p_new is null then '{}'::text[]
    else coalesce((
      select array_agg(k order by k)
      from jsonb_object_keys(p_new) as k
      where (p_old -> k) is distinct from (p_new -> k)
        and not (k = any (case p_table
          when 'bed_availability' then array['updated_at', 'updated_by']
          when 'screens' then array['updated_at', 'last_seen', 'last_content_sync', 'build_version']
          else array['updated_at']
        end))
    ), '{}'::text[])
  end;
$$;

-- A jsonb value with every key ending in "Es" removed, at any depth. If two
-- values are equal after this, only Spanish text differed between them.
create or replace function public.audit_strip_es(j jsonb)
returns jsonb language plpgsql immutable set search_path = public as $$
begin
  if jsonb_typeof(j) = 'object' then
    return coalesce((
      select jsonb_object_agg(e.key, public.audit_strip_es(e.value))
      from jsonb_each(j) as e
      where e.key !~ 'Es$'
    ), '{}'::jsonb);
  elsif jsonb_typeof(j) = 'array' then
    return coalesce((
      select jsonb_agg(public.audit_strip_es(a.value) order by a.ord)
      from jsonb_array_elements(j) with ordinality as a(value, ord)
    ), '[]'::jsonb);
  end if;
  return j;
end;
$$;

create or replace function public.audit_location_name(p_id text)
returns text language sql stable set search_path = public as $$
  select case
    when p_id is null then 'no location'
    else coalesce(
      (select l.name from public.bulletin_locations l where l.id::text = p_id),
      'a deleted location')
  end;
$$;

create or replace function public.audit_slide_title(p_slide jsonb)
returns text language sql immutable set search_path = public as $$
  select coalesce(nullif(btrim(p_slide ->> 'title'), ''), 'Untitled slide');
$$;

-- The default sidebar name of a bulletin page key (the keys used by
-- builtin_page_locations, display_settings.paused_pages and sidebar_names).
-- Null for a services page that no longer exists.
create or replace function public.audit_page_default_name(p_key text)
returns text language plpgsql stable set search_path = public as $$
declare
  v_idx bigint;
  v_title text;
begin
  if p_key = 'builtin:new-arrivals' then return 'New arrivals page'; end if;
  if p_key = 'builtin:demographic' then return 'Pregnant women page'; end if;
  if p_key = 'builtin:events-today' then return 'Events today'; end if;

  if p_key like 'builtin:services:%' then
    select p.ord into v_idx
    from public.info_content c,
         jsonb_array_elements(public.audit_jarr(c.content -> 'services' -> 'pages'))
           with ordinality as p(page, ord)
    where c.id = 1 and p.page ->> 'id' = substr(p_key, 18);
    if v_idx is null then return null; end if;
    return 'This Week''s Services — Page ' || v_idx;
  end if;

  if p_key like 'slide:%' then
    select public.audit_slide_title(to_jsonb(s)) into v_title
    from public.slides s where s.id::text = substr(p_key, 7);
    return coalesce(v_title, 'a deleted slide');
  end if;

  return p_key;
end;
$$;

-- The name staff see for a page key: their sidebar rename, else the default.
create or replace function public.audit_page_name(p_key text)
returns text language sql stable set search_path = public as $$
  select coalesce(
    (select nullif(btrim(d.sidebar_names ->> p_key), '')
       from public.display_settings d where d.id = 1),
    public.audit_page_default_name(p_key),
    'a removed page');
$$;

-- display_settings.hidden_builtins keys -> names.
create or replace function public.audit_builtin_label(p_key text)
returns text language sql stable set search_path = public as $$
  select case p_key
    when 'services'     then 'Services pages'
    when 'new-arrivals' then public.audit_page_name('builtin:new-arrivals')
    when 'demographic'  then public.audit_page_name('builtin:demographic')
    when 'events-today' then public.audit_page_name('builtin:events-today')
    else p_key
  end;
$$;

-- Calendar times are a fixed UTC wall clock (see AGENTS.md), so they are
-- formatted in UTC here, never converted to Pacific.
create or replace function public.audit_event_when(p_event jsonb)
returns text language plpgsql stable set search_path = public as $$
declare
  s timestamp := (p_event ->> 'starts_at')::timestamptz at time zone 'UTC';
  e timestamp := (p_event ->> 'ends_at')::timestamptz at time zone 'UTC';
  fmt constant text := 'Dy Mon FMDD, FMHH12:MI AM';
begin
  if coalesce((p_event ->> 'all_day')::boolean, false) then
    return to_char(s, 'Dy Mon FMDD') || ' (all day)';
  end if;
  if e is null then return to_char(s, fmt); end if;
  if e::date = s::date then
    return to_char(s, fmt) || '–' || to_char(e, 'FMHH12:MI AM');
  end if;
  return to_char(s, fmt) || ' – ' || to_char(e, fmt);
end;
$$;

-- Column names -> words for "Edited slide "X": title, image".
create or replace function public.audit_field_labels(p_table text, p_fields text[])
returns text language sql immutable set search_path = public as $$
  select string_agg(distinct
    case
      when p_table = 'slides' then case f
        when 'title' then 'title'           when 'title_es' then 'Spanish title'
        when 'body' then 'text'             when 'body_es' then 'Spanish text'
        when 'items' then 'list'            when 'items_es' then 'Spanish list'
        when 'caption' then 'caption'       when 'caption_es' then 'Spanish caption'
        when 'image_path' then 'image'      when 'menu' then 'weekly menu'
        when 'content' then 'details'       when 'background' then 'background color'
        when 'template' then 'layout'       when 'position' then 'order'
        else replace(f, '_', ' ') end
      when p_table = 'events' then case f
        when 'starts_at' then 'time'        when 'ends_at' then 'time'
        when 'all_day' then 'all-day'       when 'show_on_dashboard' then 'Live Calendar'
        else replace(f, '_', ' ') end
      else replace(f, '_', ' ')
    end, ', ')
  from unnest(p_fields) as f;
$$;


-- 4) The wording: one function, one block per table --------------------------
-- Returns the entry to write, or o_summary = null to skip the change as noise.
-- Dropped first: an earlier draft named the last parameter p_automated, and
-- CREATE OR REPLACE cannot rename a parameter. Same argument types, so the
-- trigger function below (which calls this by position) is unaffected.
drop function if exists public.audit_describe(text, text, jsonb, jsonb, text[], boolean);

create or replace function public.audit_describe(
  p_table text,
  p_op text,
  p_old jsonb,
  p_new jsonb,
  p_changed text[],
  -- True only when there is no signed-in user AND app.actor_label is set: a
  -- named automation. A "Direct database edit" is a person, so it is false.
  p_labeled_automation boolean,
  out o_category text,
  out o_record_id text,
  out o_summary text,
  out o_old_data jsonb,
  out o_new_data jsonb,
  out o_changed text[]
)
language plpgsql volatile set search_path = public as $$
declare
  v_row jsonb := coalesce(p_new, p_old);
  v_title text;
  v_name text;
  v_target text;
  v_loc text;
  v_fields text[];
  v_parts text[] := '{}';
  v_remaining int;
  v_key text;
  v_keys text[];
  v_page jsonb;
  v_prev jsonb;
  v_idx bigint;
  v_oc jsonb;
  v_nc jsonb;
  v_op jsonb;
  v_np jsonb;
  v_names jsonb;
  v_on jsonb;
  v_nn jsonb;
  v_default text;
  v_sidebar_only boolean := true;
begin
  o_record_id := v_row ->> 'id';
  o_changed := p_changed;
  if p_op = 'UPDATE' then
    o_old_data := public.audit_pick(p_old, p_changed);
    o_new_data := public.audit_pick(p_new, p_changed);
  elsif p_op = 'INSERT' then
    o_new_data := p_new;
  else
    o_old_data := p_old;
  end if;

  -- Custom slides ------------------------------------------------------------
  if p_table = 'slides' then
    o_category := 'Custom slides';
    v_title := '"' || public.audit_slide_title(v_row) || '"';

    if p_op = 'INSERT' then
      o_summary := 'Added slide ' || v_title;
      return;
    elsif p_op = 'DELETE' then
      o_summary := 'Permanently deleted slide ' || v_title;
      return;
    end if;

    if 'hidden' = any (p_changed) then
      o_summary := case when (p_new ->> 'hidden')::boolean
        then 'Deleted slide ' || v_title || ' (moved to Recently deleted)'
        else 'Restored slide ' || v_title end;
      return;
    end if;

    if 'is_paused' = any (p_changed) then
      o_summary := case when (p_new ->> 'is_paused')::boolean
        then 'Hid slide ' || v_title || ' from screens'
        else 'Showed slide ' || v_title || ' on screens again' end;
      return;
    end if;

    if p_changed = array['position'] then
      -- One entry per drag. The lock makes this person's parallel position
      -- writes take turns, so each one sees whether another already logged.
      perform pg_advisory_xact_lock(
        hashtext('smcs_audit_reorder:' || coalesce(auth.uid()::text, '')));
      if exists (
        select 1 from public.audit_logs l
        where l.table_name = 'slides'
          and l.changed_fields = array['position']
          and l.actor_id is not distinct from auth.uid()
          and l.created_at > now() - interval '10 seconds'
      ) then
        return;
      end if;
      o_summary := 'Reordered custom slides';
      return;
    end if;

    v_fields := array_remove(p_changed, 'position');
    if v_fields = array['image_path'] then
      o_summary := case
        when p_old ->> 'image_path' is null then 'Added image to slide '
        when p_new ->> 'image_path' is null then 'Removed image from slide '
        else 'Replaced image on slide ' end || v_title;
    -- A weekly-menu save that moves the week also rewrites the title (and its
    -- Spanish) from the dates, so those ride along without changing the story.
    elsif 'menu' = any (v_fields)
          and v_fields <@ array['menu', 'title', 'title_es']
          and p_new ->> 'template' = 'weekly-menu' then
      o_summary := 'Updated weekly menu on slide ' || v_title || coalesce(
        ' (week of ' || case
          when p_new -> 'menu' ->> 'weekOf' ~ '^\d{4}-\d{2}-\d{2}$'
          then to_char((p_new -> 'menu' ->> 'weekOf')::date, 'Mon FMDD') end || ')',
        '');
    elsif v_fields <@ array['title_es', 'body_es', 'items_es', 'caption_es'] then
      o_summary := 'Updated Spanish text on slide ' || v_title;
    else
      o_summary := 'Edited slide ' || v_title
        || case when 'title' = any (v_fields)
             then ' (was "' || public.audit_slide_title(p_old) || '")' else '' end
        || ': ' || public.audit_field_labels('slides', v_fields);
    end if;
    return;
  end if;

  -- Location targeting (custom slides and built-in pages) ---------------------
  if p_table in ('slide_locations', 'builtin_page_locations') then
    v_loc := public.audit_location_name(v_row ->> 'location_id');

    if p_table = 'slide_locations' then
      o_category := 'Custom slides';
      o_record_id := (v_row ->> 'slide_id') || ':' || (v_row ->> 'location_id');
      select '"' || public.audit_slide_title(to_jsonb(s)) || '"' into v_title
      from public.slides s where s.id::text = v_row ->> 'slide_id';
      -- Gone means the slide itself was deleted, which is already logged.
      if v_title is null then return; end if;
      v_target := 'slide ' || v_title;
      select count(*) into v_remaining
      from public.slide_locations where slide_id::text = v_row ->> 'slide_id';
    else
      o_category := 'Bulletin pages';
      o_record_id := (v_row ->> 'page_key') || ':' || (v_row ->> 'location_id');
      -- A removed services page: its removal is already logged.
      if public.audit_page_default_name(v_row ->> 'page_key') is null then return; end if;
      v_target := '"' || public.audit_page_name(v_row ->> 'page_key') || '"';
      select count(*) into v_remaining
      from public.builtin_page_locations where page_key = v_row ->> 'page_key';
    end if;

    if p_op = 'INSERT' then
      o_summary := 'Added ' || v_loc || ' to the locations for ' || v_target;
    elsif p_op = 'DELETE' then
      o_summary := 'Removed ' || v_loc || ' from the locations for ' || v_target
        || case when v_remaining = 0 then ' (now shows at all locations)' else '' end;
    else
      o_summary := 'Changed the locations for ' || v_target;
    end if;
    return;
  end if;

  -- Display locations ---------------------------------------------------------
  if p_table = 'bulletin_locations' then
    o_category := 'Locations';
    v_title := '"' || coalesce(v_row ->> 'name', '') || '"';
    if p_op = 'INSERT' then
      o_summary := 'Added display location ' || v_title;
    elsif p_op = 'DELETE' then
      o_summary := 'Deleted display location ' || v_title;
    elsif 'name' = any (p_changed) then
      o_summary := 'Renamed display location "' || (p_old ->> 'name') || '" to ' || v_title;
    else
      o_summary := 'Edited display location ' || v_title || ': '
        || public.audit_field_labels(p_table, p_changed);
    end if;
    return;
  end if;

  -- Built-in bulletin pages (one JSON row for all of them) --------------------
  if p_table = 'info_content' then
    o_category := 'Bulletin pages';
    if p_op = 'INSERT' then
      o_summary := 'Saved the bulletin pages for the first time';
      o_new_data := null; -- the whole blob; not worth storing
      return;
    elsif p_op = 'DELETE' then
      o_summary := 'Deleted all bulletin page content';
      o_old_data := null;
      return;
    end if;

    v_oc := public.audit_jobj(p_old -> 'content');
    v_nc := public.audit_jobj(p_new -> 'content');
    v_op := public.audit_jarr(v_oc -> 'services' -> 'pages');
    v_np := public.audit_jarr(v_nc -> 'services' -> 'pages');
    select public.audit_jobj(d.sidebar_names) into v_names
    from public.display_settings d where d.id = 1;
    v_names := coalesce(v_names, '{}'::jsonb);

    -- Store only the pages that changed, keyed by the name staff see.
    o_changed := '{}';
    o_old_data := '{}'::jsonb;
    o_new_data := '{}'::jsonb;

    -- Services pages added or edited.
    for v_page, v_idx in
      select p.page, p.ord from jsonb_array_elements(v_np) with ordinality as p(page, ord)
    loop
      v_name := coalesce(
        nullif(btrim(v_names ->> ('builtin:services:' || (v_page ->> 'id'))), ''),
        'This Week''s Services — Page ' || v_idx);
      v_prev := null;
      select p.page into v_prev
      from jsonb_array_elements(v_op) as p(page)
      where p.page ->> 'id' = v_page ->> 'id'
      limit 1;

      if v_prev is null then
        v_parts := array_append(v_parts, 'Added "' || v_name || '"');
      elsif v_prev is distinct from v_page then
        if (v_prev - 'showWeather') = (v_page - 'showWeather') then
          v_parts := array_append(v_parts, 'Turned weather '
            || case when v_page ->> 'showWeather' = 'false' then 'off' else 'on' end
            || ' for "' || v_name || '"');
        elsif public.audit_strip_es(v_prev) = public.audit_strip_es(v_page) then
          v_parts := array_append(v_parts, 'Updated Spanish text on "' || v_name || '"');
        else
          v_parts := array_append(v_parts, 'Edited "' || v_name || '"');
        end if;
      else
        continue;
      end if;
      o_changed := array_append(o_changed, v_name);
      o_old_data := o_old_data || jsonb_build_object(v_name, v_prev);
      o_new_data := o_new_data || jsonb_build_object(v_name, v_page);
    end loop;

    -- Services pages removed.
    for v_page, v_idx in
      select p.page, p.ord from jsonb_array_elements(v_op) with ordinality as p(page, ord)
    loop
      if not exists (
        select 1 from jsonb_array_elements(v_np) as n(page)
        where n.page ->> 'id' = v_page ->> 'id'
      ) then
        v_name := coalesce(
          nullif(btrim(v_names ->> ('builtin:services:' || (v_page ->> 'id'))), ''),
          'This Week''s Services — Page ' || v_idx);
        v_parts := array_append(v_parts, 'Removed "' || v_name || '"');
        o_changed := array_append(o_changed, v_name || ' (removed)');
        o_old_data := o_old_data || jsonb_build_object(v_name || ' (removed)', v_page);
        o_new_data := o_new_data || jsonb_build_object(v_name || ' (removed)', null);
      end if;
    end loop;

    -- Same pages, new order.
    if cardinality(v_parts) = 0 and
       (select array_agg(p.page ->> 'id' order by p.ord)
          from jsonb_array_elements(v_op) with ordinality as p(page, ord))
       is distinct from
       (select array_agg(p.page ->> 'id' order by p.ord)
          from jsonb_array_elements(v_np) with ordinality as p(page, ord))
    then
      v_parts := array_append(v_parts, 'Reordered the services pages');
      o_changed := array_append(o_changed, 'services page order');
    end if;

    -- The two fixed pages.
    foreach v_key in array array['newArrivals', 'demographic'] loop
      v_prev := v_oc -> v_key;
      v_page := v_nc -> v_key;
      if v_prev is distinct from v_page then
        v_name := public.audit_page_name(case v_key
          when 'newArrivals' then 'builtin:new-arrivals' else 'builtin:demographic' end);
        if public.audit_strip_es(v_prev) = public.audit_strip_es(v_page) then
          v_parts := array_append(v_parts, 'Updated Spanish text on "' || v_name || '"');
        else
          v_parts := array_append(v_parts, 'Edited "' || v_name || '"');
        end if;
        o_changed := array_append(o_changed, v_name);
        o_old_data := o_old_data || jsonb_build_object(v_name, v_prev);
        o_new_data := o_new_data || jsonb_build_object(v_name, v_page);
      end if;
    end loop;

    -- Anything else in the blob (pageUpdatedAt is bookkeeping and ignored).
    if cardinality(v_parts) = 0
       and (v_oc - 'pageUpdatedAt' - 'services' - 'newArrivals' - 'demographic')
           is distinct from
           (v_nc - 'pageUpdatedAt' - 'services' - 'newArrivals' - 'demographic')
    then
      v_parts := array_append(v_parts, 'Edited the bulletin pages');
    end if;

    if cardinality(v_parts) = 0 then return; end if; -- only bookkeeping moved
    o_summary := array_to_string(v_parts, '; ');
    return;
  end if;

  -- Removed/restored pages, hidden pages, sidebar names -----------------------
  if p_table = 'display_settings' then
    if p_op = 'DELETE' then
      o_category := 'Bulletin pages';
      o_summary := 'Cleared the display settings';
      return;
    end if;

    -- Removed from the rotation (Recently deleted) / restored.
    v_keys := array(
      select x from unnest(public.audit_text_array(p_new -> 'hidden_builtins')) as x
      except select y from unnest(public.audit_text_array(p_old -> 'hidden_builtins')) as y);
    foreach v_key in array v_keys loop
      v_parts := array_append(v_parts,
        'Removed "' || public.audit_builtin_label(v_key) || '" from the rotation (moved to Recently deleted)');
    end loop;
    v_keys := array(
      select x from unnest(public.audit_text_array(p_old -> 'hidden_builtins')) as x
      except select y from unnest(public.audit_text_array(p_new -> 'hidden_builtins')) as y);
    foreach v_key in array v_keys loop
      v_parts := array_append(v_parts,
        'Restored "' || public.audit_builtin_label(v_key) || '" to the rotation');
    end loop;

    -- "Hide slide" on built-in pages.
    v_keys := array(
      select x from unnest(public.audit_text_array(p_new -> 'paused_pages')) as x
      except select y from unnest(public.audit_text_array(p_old -> 'paused_pages')) as y);
    foreach v_key in array v_keys loop
      v_parts := array_append(v_parts, 'Hid "' || public.audit_page_name(v_key) || '" from screens');
    end loop;
    v_keys := array(
      select x from unnest(public.audit_text_array(p_old -> 'paused_pages')) as x
      except select y from unnest(public.audit_text_array(p_new -> 'paused_pages')) as y);
    foreach v_key in array v_keys loop
      v_parts := array_append(v_parts, 'Showed "' || public.audit_page_name(v_key) || '" on screens again');
    end loop;

    if cardinality(v_parts) > 0 then v_sidebar_only := false; end if;

    -- Sidebar renames (manage page labels only; never on the screens).
    v_on := public.audit_jobj(p_old -> 'sidebar_names');
    v_nn := public.audit_jobj(p_new -> 'sidebar_names');
    v_keys := array(
      select k from jsonb_object_keys(v_on) as k
      union select k from jsonb_object_keys(v_nn) as k);
    foreach v_key in array v_keys loop
      if (v_on ->> v_key) is distinct from (v_nn ->> v_key) then
        v_default := coalesce(public.audit_page_default_name(v_key), 'a removed page');
        if v_nn ->> v_key is null then
          v_parts := array_append(v_parts, 'Reset "' || (v_on ->> v_key)
            || '" to its default name "' || v_default || '" in the manage sidebar');
        else
          v_parts := array_append(v_parts, 'Renamed "' || coalesce(v_on ->> v_key, v_default)
            || '" to "' || (v_nn ->> v_key) || '" in the manage sidebar');
        end if;
      end if;
    end loop;

    if cardinality(v_parts) = 0 then return; end if; -- e.g. the slide-pause nudge
    o_category := case when v_sidebar_only then 'Manage page' else 'Bulletin pages' end;
    o_summary := array_to_string(v_parts, '; ');
    return;
  end if;

  -- Bed counts ------------------------------------------------------------------
  if p_table = 'bed_availability' then
    o_category := 'Bed counts';
    v_name := (v_row ->> 'program_label')
      || case when v_row ->> 'label' = 'Available' then '' else ' (' || (v_row ->> 'label') || ')' end;
    if p_op = 'UPDATE' and 'count' = any (p_changed) then
      o_summary := 'Bed count updated'
        || case when p_labeled_automation then ' automatically' else '' end
        || ': ' || v_name || ' ' || (p_old ->> 'count') || ' → ' || (p_new ->> 'count');
    elsif p_op = 'UPDATE' then
      o_summary := 'Edited bed count row ' || v_name || ': ' || public.audit_field_labels(p_table, p_changed);
    elsif p_op = 'INSERT' then
      o_summary := 'Added bed count row ' || v_name;
    else
      o_summary := 'Removed bed count row ' || v_name;
    end if;
    return;
  end if;

  -- Announcements ---------------------------------------------------------------
  if p_table = 'announcements' then
    o_category := 'Announcements';
    v_title := '"' || coalesce(v_row ->> 'message', '') || '"';
    if p_op = 'INSERT' then
      o_summary := 'Pushed announcement: ' || v_title;
    elsif p_op = 'DELETE' then
      o_summary := 'Deleted announcement ' || v_title;
    elsif 'expires_at' = any (p_changed)
          and (p_new ->> 'expires_at')::timestamptz < (p_old ->> 'expires_at')::timestamptz then
      -- "End now", or replaced by a newer push (logged right after this).
      o_summary := 'Ended announcement ' || v_title || ' early';
    else
      o_summary := 'Edited announcement ' || v_title;
    end if;
    return;
  end if;

  -- Lost & found ----------------------------------------------------------------
  if p_table = 'lost_found_items' then
    o_category := 'Lost & found';
    v_name := '"' || coalesce(v_row ->> 'item', '') || '" ('
      || public.audit_location_name(v_row ->> 'location_id') || ')';
    if p_op = 'INSERT' then
      o_summary := 'Added lost & found item ' || v_name;
    elsif p_op = 'DELETE' then
      if (p_old ->> 'expires_at')::timestamptz <= now() then return; end if; -- the purge
      o_summary := 'Removed lost & found item ' || v_name;
    else
      o_summary := 'Edited lost & found item ' || v_name;
    end if;
    return;
  end if;

  -- Calendar events ---------------------------------------------------------------
  if p_table = 'events' then
    o_category := 'Calendar';
    v_title := '"' || coalesce(nullif(btrim(v_row ->> 'name'), ''), 'Untitled event') || '"';
    if p_op = 'INSERT' then
      o_summary := 'Added event ' || v_title || ' (' || public.audit_event_when(p_new) || ')';
    elsif p_op = 'DELETE' then
      o_summary := 'Deleted event ' || v_title || ' (' || public.audit_event_when(p_old) || ')';
    elsif p_changed <@ array['starts_at', 'ends_at', 'all_day'] then
      o_summary := 'Moved event ' || v_title || ' to ' || public.audit_event_when(p_new);
    elsif p_changed = array['show_on_dashboard'] then
      o_summary := case when (p_new ->> 'show_on_dashboard')::boolean
        then 'Put ' || v_title || ' on the Live Calendar'
        else 'Took ' || v_title || ' off the Live Calendar' end;
    else
      o_summary := 'Edited event ' || v_title
        || case when 'name' = any (p_changed)
             then ' (was "' || coalesce(p_old ->> 'name', '') || '")' else '' end
        || ': ' || public.audit_field_labels(p_table, p_changed);
    end if;
    return;
  end if;

  -- Screens (/manage/health). Heartbeat columns never reach here. -------------
  if p_table = 'screens' then
    o_category := 'Screens';
    v_title := '"' || coalesce(v_row ->> 'name', '') || '"';
    if p_op = 'INSERT' then
      o_summary := 'Added screen ' || v_title || ' ('
        || public.audit_location_name(p_new ->> 'location_id') || ')';
    elsif p_op = 'DELETE' then
      o_summary := 'Deleted screen ' || v_title;
    else
      if 'name' = any (p_changed) then
        v_parts := array_append(v_parts,
          'Renamed screen "' || coalesce(p_old ->> 'name', '') || '" to ' || v_title);
      end if;
      if 'location_id' = any (p_changed) then
        v_parts := array_append(v_parts, 'Moved screen ' || v_title || ' to '
          || public.audit_location_name(p_new ->> 'location_id'));
      end if;
      o_summary := coalesce(
        nullif(array_to_string(v_parts, '; '), ''),
        'Edited screen ' || v_title || ': ' || public.audit_field_labels(p_table, p_changed));
    end if;
    return;
  end if;

  -- Any other table: no wording, so nothing is logged.
end;
$$;


-- 5) The trigger function ------------------------------------------------------
create or replace function public.audit_log_change()
returns trigger
language plpgsql
security definer          -- writes audit_logs, which no API role can write
set search_path = public
as $$
declare
  v_uid uuid;
  v_label text;
  v_old jsonb;
  v_new jsonb;
  v_changed text[];
  v_entry record;
  v_actor text;
begin
  -- Everything is inside this block so that NO failure here can fail the
  -- write that fired the trigger: on any error only this block is undone.
  begin
    v_uid := auth.uid();
    -- Only meaningful without a signed-in user; ignored otherwise.
    v_label := case when v_uid is null
      then nullif(btrim(current_setting('app.actor_label', true)), '') end;
    v_old := case when tg_op <> 'INSERT' then to_jsonb(old) end;
    v_new := case when tg_op <> 'DELETE' then to_jsonb(new) end;

    v_changed := public.audit_changed_fields(tg_table_name, v_old, v_new);
    if tg_op = 'UPDATE' and cardinality(v_changed) = 0 then
      return null; -- only bookkeeping columns (or nothing) changed
    end if;

    select * into v_entry
    from public.audit_describe(tg_table_name, tg_op, v_old, v_new, v_changed, v_label is not null);
    if v_entry.o_summary is null then
      return null; -- the describer chose to skip this change
    end if;

    if v_uid is null then
      -- No signed-in user. Automations label themselves (see the header);
      -- anything unlabeled is a person editing the database directly.
      v_actor := coalesce(v_label, 'Direct database edit');
    else
      select coalesce(nullif(btrim(p.full_name), ''), u.email::text) into v_actor
      from auth.users u
      left join public.profiles p on p.id = u.id
      where u.id = v_uid;
      v_actor := coalesce(v_actor, 'Unknown user');
    end if;

    insert into public.audit_logs (
      actor_id, actor_name, source, action, category, table_name, record_id,
      summary, old_data, new_data, changed_fields
    ) values (
      v_uid,
      v_actor,
      case when v_uid is null then 'automated' else 'user' end,
      lower(tg_op),
      v_entry.o_category,
      tg_table_name,
      v_entry.o_record_id,
      v_entry.o_summary,
      v_entry.o_old_data,
      v_entry.o_new_data,
      coalesce(v_entry.o_changed, '{}')
    );
  exception when others then
    raise warning 'audit log skipped for %.% (%): %', tg_table_name, tg_op, sqlstate, sqlerrm;
  end;
  return null; -- AFTER trigger: the return value is ignored
end;
$$;


-- 6) Attach the trigger to every audited table ----------------------------------
-- Guarded so a project missing an optional table (lost_found_items before
-- 0028/0029) still runs. Re-running replaces each trigger.
do $$
declare
  t text;
begin
  foreach t in array array[
    'slides', 'slide_locations', 'builtin_page_locations', 'bulletin_locations',
    'info_content', 'display_settings', 'bed_availability', 'announcements',
    'lost_found_items', 'events', 'screens'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists audit_log on public.%I', t);
      execute format(
        'create trigger audit_log after insert or update or delete on public.%I '
        'for each row execute function public.audit_log_change()', t);
    end if;
  end loop;
end $$;


-- 7) RPCs for the Logs screen and the unread badge -----------------------------
-- Badge count: entries since this admin last opened Logs, not counting their
-- own. Stops at 10 because the badge shows "9+" from there.
create or replace function public.audit_logs_unread_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case when public.current_user_role() = 'admin' then (
    select count(*)::int from (
      select 1
      from public.audit_logs l
      where l.created_at > coalesce(
              (select p.logs_last_seen_at from public.profiles p where p.id = auth.uid()),
              '-infinity'::timestamptz)
        and l.actor_id is distinct from auth.uid()
      limit 10
    ) as unread
  ) else 0 end;
$$;

-- Deletes entries older than 180 days. For the SQL Editor, pg_cron, and
-- mark_audit_logs_seen below; not callable through the API.
create or replace function public.purge_old_audit_logs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.audit_logs where created_at < now() - interval '180 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- Called when an admin opens Logs: clears their badge (database clock, not
-- the laptop's) and runs the retention purge.
create or replace function public.mark_audit_logs_seen()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(public.current_user_role(), '') <> 'admin' then
    raise exception 'Only admins can read the logs';
  end if;
  update public.profiles set logs_last_seen_at = now() where id = auth.uid();
  perform public.purge_old_audit_logs();
end;
$$;

-- People who appear in the log, for the "by user" filter (PostgREST has no
-- DISTINCT). Latest name snapshot per person. Empty for non-admins.
create or replace function public.audit_log_actors()
returns table (actor_id uuid, actor_name text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (l.actor_id) l.actor_id, l.actor_name
  from public.audit_logs l
  where l.actor_id is not null
    and public.current_user_role() = 'admin'
  order by l.actor_id, l.created_at desc;
$$;

-- Internal helpers and the purge are not part of the API.
revoke all on function public.audit_jarr(jsonb) from public, anon, authenticated;
revoke all on function public.audit_jobj(jsonb) from public, anon, authenticated;
revoke all on function public.audit_text_array(jsonb) from public, anon, authenticated;
revoke all on function public.audit_pick(jsonb, text[]) from public, anon, authenticated;
revoke all on function public.audit_changed_fields(text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.audit_strip_es(jsonb) from public, anon, authenticated;
revoke all on function public.audit_location_name(text) from public, anon, authenticated;
revoke all on function public.audit_slide_title(jsonb) from public, anon, authenticated;
revoke all on function public.audit_page_default_name(text) from public, anon, authenticated;
revoke all on function public.audit_page_name(text) from public, anon, authenticated;
revoke all on function public.audit_builtin_label(text) from public, anon, authenticated;
revoke all on function public.audit_event_when(jsonb) from public, anon, authenticated;
revoke all on function public.audit_field_labels(text, text[]) from public, anon, authenticated;
revoke all on function public.audit_describe(text, text, jsonb, jsonb, text[], boolean) from public, anon, authenticated;
revoke all on function public.audit_log_change() from public, anon, authenticated;
revoke all on function public.purge_old_audit_logs() from public, anon, authenticated;

revoke all on function public.audit_logs_unread_count() from public, anon;
revoke all on function public.mark_audit_logs_seen() from public, anon;
revoke all on function public.audit_log_actors() from public, anon;
grant execute on function public.audit_logs_unread_count() to authenticated;
grant execute on function public.mark_audit_logs_seen() to authenticated;
grant execute on function public.audit_log_actors() to authenticated;


-- 8) Realtime, so the badge and an open Logs screen update live. Realtime
-- applies the SELECT policy above, so only admins receive these events.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'audit_logs'
  ) then
    alter publication supabase_realtime add table public.audit_logs;
  end if;
end $$;


-- 9) OPTIONAL nightly purge, if pg_cron is enabled (Database -> Extensions).
-- Not required: opening the Logs screen already purges. Uncomment and run once.
-- select cron.schedule(
--   'purge-old-audit-logs',
--   '30 3 * * *',
--   $$ select public.purge_old_audit_logs(); $$
-- );
