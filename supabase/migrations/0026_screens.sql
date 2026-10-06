-- SMCS, screen health monitoring for the Digital Bulletin (/information).
-- Each wall TV loads /information?screen=<id> and checks in every few minutes;
-- staff see which screens are alive on /manage/health.
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. DEV PROJECT FIRST,
-- then production. Safe to re-run. Builds on 0005 (current_user_role) and 0015
-- (bulletin_locations).

-- 1) The table. One row per physical screen, updated in place on every
-- check-in: no history/log rows, so writes stay at one row per screen per beat.
--
-- Status (Online / Delayed / Offline / Never seen) is derived from last_seen
-- when the health page reads it, never stored, so it can't go stale.
-- last_seen is null for a screen that is registered but has never checked in.
create table if not exists public.screens (
  id                text primary key
                    check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 64),
  name              text not null check (char_length(btrim(name)) between 1 and 80),
  location_id       uuid references public.bulletin_locations (id) on delete set null,
  last_seen         timestamptz,
  last_content_sync timestamptz,
  created_at        timestamptz not null default now()
);

alter table public.screens enable row level security;

-- 2) Staff read and manage the screen list. Not public: the wall display never
-- reads this table, it only checks in through screen_heartbeat below.
drop policy if exists "Staff read screens" on public.screens;
create policy "Staff read screens"
  on public.screens for select
  to authenticated
  using (public.current_user_role() in ('employee', 'admin'));

drop policy if exists "Staff insert screens" on public.screens;
create policy "Staff insert screens"
  on public.screens for insert
  to authenticated
  with check (public.current_user_role() in ('employee', 'admin'));

drop policy if exists "Staff update screens" on public.screens;
create policy "Staff update screens"
  on public.screens for update
  to authenticated
  using (public.current_user_role() in ('employee', 'admin'))
  with check (public.current_user_role() in ('employee', 'admin'));

drop policy if exists "Staff delete screens" on public.screens;
create policy "Staff delete screens"
  on public.screens for delete
  to authenticated
  using (public.current_user_role() in ('employee', 'admin'));

-- Column grants: staff may set a screen's id/name/location, but never its
-- check-in times. Those are written only by screen_heartbeat, so a staff edit
-- can't make a dead screen look alive. The id is fixed once created (it is
-- baked into that TV's Yodeck URL); to change it, delete and re-add.
revoke all on public.screens from anon, authenticated;
grant select, delete on public.screens to authenticated;
grant insert (id, name, location_id) on public.screens to authenticated;
grant update (name, location_id) on public.screens to authenticated;

-- 3) Check-in. Called by the wall display, which is not signed in, so this is
-- SECURITY DEFINER and granted to anon. It is deliberately narrow:
--   - it only UPDATEs an existing row; an unknown id changes nothing, so a
--     typo'd or missing ?screen= can never create phantom screens;
--   - both timestamps are the DATABASE's now(), never the TV's clock. The TV
--     only reports whether its content read just succeeded (p_content_ok);
--     on false, last_content_sync keeps its previous value, so it always
--     means "the last time this screen could read content".
-- Anyone who knows a screen id could mark it alive; that is the accepted cost
-- of an unauthenticated display, and all they can touch is two timestamps.
--
-- An earlier draft took (text, timestamptz); dropped so a re-run leaves only
-- the current signature.
drop function if exists public.screen_heartbeat(text, timestamptz);

create or replace function public.screen_heartbeat(
  p_screen_id  text,
  p_content_ok boolean default false
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.screens
     set last_seen = now(),
         last_content_sync = case when p_content_ok then now() else last_content_sync end
   where id = p_screen_id;
$$;

revoke all on function public.screen_heartbeat(text, boolean) from public;
grant execute on function public.screen_heartbeat(text, boolean) to anon, authenticated;

-- Not added to the supabase_realtime publication: the health page polls, and a
-- broadcast on every heartbeat would be wasted Realtime traffic.
