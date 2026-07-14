-- SMCS, make the Live Dashboard admin-curated.
--
-- Model: an event appears on the Live Dashboard ONLY when an admin/employee
-- explicitly flags it (show_on_dashboard). It defaults to false, so nothing
-- lands on the dashboard by default. A client signing up for a service only
-- ever puts it on that client's personal calendar (via the signups table),
-- never on the dashboard.
--
-- This replaces the earlier `visibility` column from 0003.
-- Run in Supabase: SQL Editor → New query → paste → Run.

-- 1) New flag, default false (off the dashboard unless explicitly added).
alter table public.events
  add column if not exists show_on_dashboard boolean not null default false;

-- 2) Preserve current dashboard content: events that were 'public' stay on.
update public.events
set show_on_dashboard = true
where visibility = 'public';

-- 3) Rebuild read policies around the new flag (OR'd together):
--    - anyone can read events flagged for the dashboard
--    - a signed-in user can read events they're personally signed up for
--    (admin/employee "read all" comes with the admin phase)
drop policy if exists "Public events readable by anyone" on public.events;
drop policy if exists "Dashboard events readable by anyone" on public.events;
create policy "Dashboard events readable by anyone"
  on public.events
  for select
  to anon, authenticated
  using (show_on_dashboard = true);

drop policy if exists "Signed-up users read their events" on public.events;
create policy "Signed-up users read their events"
  on public.events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.signups s
      where s.event_id = events.id
        and s.user_id = auth.uid()
    )
  );

-- 4) Drop the now-replaced visibility column.
alter table public.events drop column if exists visibility;
