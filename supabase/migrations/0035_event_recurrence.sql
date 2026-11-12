-- SMCS, weekly recurring events. Run in Supabase: SQL Editor → New query →
-- paste → Run. Safe to re-run.
--
-- MODEL
-- A recurring event is still ONE row in public.events. When recurrence_days is
-- null the event is one-time, exactly as before (every existing row stays so).
-- When it is set, starts_at/ends_at describe the FIRST date plus the time of
-- day and length of every occurrence, and the event repeats on each selected
-- weekday from that date on. The website expands the row into occurrences in
-- src/lib/recurrence.ts; nothing here generates rows per date.
--
--   recurrence_days        smallint[]  weekdays, 0 = Sunday … 6 = Saturday
--                                      (UTC wall clock, same as getUTCDay)
--   recurrence_until       date        last date it may occur (inclusive);
--                                      null = repeats indefinitely
--   recurrence_exceptions  date[]      single dates skipped ("Skip … only")
--
-- Times follow the fixed-UTC wall-clock convention (AGENTS.md): weekdays and
-- dates are taken from starts_at AT TIME ZONE 'UTC', never local time.
--
-- RLS: unchanged. The existing staff insert/update/delete and read policies on
-- events cover the new columns.
-- REALTIME: unchanged. public.events is in supabase_realtime with no column
-- list (0001), so the new columns flow to every subscriber automatically.
-- AUDIT: the audit_log trigger (0034) snapshots whole rows with to_jsonb, so
-- the new columns are diffed automatically. This migration redefines three
-- 0034 functions so recurring events read well on the Logs screen:
--   * audit_event_when   describes a series ("every Mon, Wed, 9:00 AM–…")
--   * audit_field_labels adds "repeat days", "repeat end date", "skipped dates"
--   * audit_describe     events block only: "Skipped Tue Nov 25 for "X"",
--                        "Undid skip of …", and repeat-schedule changes.
--     Every other block is copied unchanged from 0034.

-- 1) Columns ---------------------------------------------------------------------
alter table public.events
  add column if not exists recurrence_days smallint[],
  add column if not exists recurrence_until date,
  add column if not exists recurrence_exceptions date[];

-- 2) Constraints (dropped first so re-running replaces them) --------------------
alter table public.events drop constraint if exists events_recurrence_days_valid;
alter table public.events add constraint events_recurrence_days_valid check (
  recurrence_days is null
  or (cardinality(recurrence_days) between 1 and 7
      and recurrence_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[])
);

-- "Ends on" requires a series and cannot be before its first date.
alter table public.events drop constraint if exists events_recurrence_until_valid;
alter table public.events add constraint events_recurrence_until_valid check (
  recurrence_until is null
  or (recurrence_days is not null
      and recurrence_until >= (starts_at at time zone 'UTC')::date)
);

-- Skipped dates only make sense on a series.
alter table public.events drop constraint if exists events_recurrence_exceptions_valid;
alter table public.events add constraint events_recurrence_exceptions_valid check (
  recurrence_exceptions is null or recurrence_days is not null
);

-- A recurring event must be shorter than 24 hours so occurrences never overlap.
alter table public.events drop constraint if exists events_recurrence_duration_valid;
alter table public.events add constraint events_recurrence_duration_valid check (
  recurrence_days is null
  or ends_at is null
  or ends_at - starts_at < interval '24 hours'
);

-- 3) Log wording -----------------------------------------------------------------
-- When an event happens. One-time events read exactly as in 0034. A series
-- reads "every Mon, Wed, Fri, 9:00 AM–10:00 AM, starting Wed Nov 12, until
-- Wed Dec 31". UTC wall clock, never converted.
create or replace function public.audit_event_when(p_event jsonb)
returns text language plpgsql stable set search_path = public as $$
declare
  s timestamp := (p_event ->> 'starts_at')::timestamptz at time zone 'UTC';
  e timestamp := (p_event ->> 'ends_at')::timestamptz at time zone 'UTC';
  fmt constant text := 'Dy Mon FMDD, FMHH12:MI AM';
  v_days text;
  v_time text;
begin
  if jsonb_typeof(p_event -> 'recurrence_days') = 'array' then
    select string_agg(
             (array['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])[d::int + 1],
             ', ' order by d::int)
      into v_days
      from jsonb_array_elements_text(p_event -> 'recurrence_days') as d;
    v_time := case
      when coalesce((p_event ->> 'all_day')::boolean, false) then 'all day'
      when e is null then to_char(s, 'FMHH12:MI AM')
      when e::date = s::date then to_char(s, 'FMHH12:MI AM') || '–' || to_char(e, 'FMHH12:MI AM')
      else to_char(s, 'FMHH12:MI AM') || '–' || to_char(e, 'FMHH12:MI AM') || ' (next day)'
    end;
    -- All seven days is the form's "Daily" box: reads "daily, 9:00 AM–…".
    v_days := case when jsonb_array_length(p_event -> 'recurrence_days') = 7
      then 'daily' else 'every ' || coalesce(v_days, '?') end;
    return v_days || ', ' || v_time
      || ', starting ' || to_char(s, 'Dy Mon FMDD')
      || coalesce(', until ' || to_char((p_event ->> 'recurrence_until')::date, 'Dy Mon FMDD'), '');
  end if;

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

-- Column names -> words. Copied whole from 0034; only the three repeat labels
-- under 'events' are new.
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
        when 'recurrence_days' then 'repeat days'
        when 'recurrence_until' then 'repeat end date'
        when 'recurrence_exceptions' then 'skipped dates'
        else replace(f, '_', ' ') end
      else replace(f, '_', ' ')
    end, ', ')
  from unnest(p_fields) as f;
$$;

-- The wording for every audited table. Copied whole from 0034 (same signature,
-- so the trigger function keeps calling it by position); ONLY the
-- "Calendar events" block differs: skipped-date wording and repeat-schedule
-- changes. Edit both this and any later copy together.
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
    elsif p_changed = array['recurrence_exceptions'] then
      -- Skip / undo-skip of single dates in a weekly series (0035).
      v_keys := array(
        select d from jsonb_array_elements_text(public.audit_jarr(p_new -> 'recurrence_exceptions')) as d
        except
        select d from jsonb_array_elements_text(public.audit_jarr(p_old -> 'recurrence_exceptions')) as d
        order by 1);
      v_fields := array(
        select d from jsonb_array_elements_text(public.audit_jarr(p_old -> 'recurrence_exceptions')) as d
        except
        select d from jsonb_array_elements_text(public.audit_jarr(p_new -> 'recurrence_exceptions')) as d
        order by 1);
      if cardinality(v_keys) > 0 then
        v_parts := v_parts || ('Skipped ' || (
          select string_agg(to_char(d::date, 'Dy Mon FMDD'), ', ' order by d)
          from unnest(v_keys) as d) || ' for ' || v_title);
      end if;
      if cardinality(v_fields) > 0 then
        v_parts := v_parts || ('Undid skip of ' || (
          select string_agg(to_char(d::date, 'Dy Mon FMDD'), ', ' order by d)
          from unnest(v_fields) as d) || ' for ' || v_title);
      end if;
      if cardinality(v_parts) = 0 then return; end if; -- same dates, reordered
      o_summary := array_to_string(v_parts, '; ');
    elsif p_changed <@ array['starts_at', 'ends_at', 'all_day'] then
      o_summary := 'Moved event ' || v_title || ' to ' || public.audit_event_when(p_new);
    elsif p_changed <@ array['all_day', 'ends_at', 'recurrence_days', 'recurrence_exceptions',
                             'recurrence_until', 'starts_at'] then
      -- The repeat schedule changed (0035).
      o_summary := case
        when p_old -> 'recurrence_days' = 'null'::jsonb or p_old -> 'recurrence_days' is null
          then 'Made ' || v_title || ' repeat ' || public.audit_event_when(p_new)
        when p_new -> 'recurrence_days' = 'null'::jsonb or p_new -> 'recurrence_days' is null
          then 'Made ' || v_title || ' a one-time event (' || public.audit_event_when(p_new) || ')'
        else 'Changed the repeat schedule of ' || v_title || ' to ' || public.audit_event_when(p_new)
      end;
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


-- 4) Same lockdown as 0034: these are internal to the audit trigger.
revoke all on function public.audit_event_when(jsonb) from public, anon, authenticated;
revoke all on function public.audit_field_labels(text, text[]) from public, anon, authenticated;
revoke all on function public.audit_describe(text, text, jsonb, jsonb, text[], boolean) from public, anon, authenticated;
