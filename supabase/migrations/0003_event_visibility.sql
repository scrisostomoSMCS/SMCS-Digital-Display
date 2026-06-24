-- SMCS — event visibility. Public events show on the Live Dashboard (and to
-- anyone); private events (e.g. personal appointments) appear ONLY on the
-- personal calendar of users signed up for them, and are not readable publicly.
-- Run in Supabase: SQL Editor → New query → paste → Run.

-- 1) visibility column (existing rows default to 'public').
alter table public.events
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'private'));

-- 2) Replace the blanket public-read policy with visibility-aware policies.
-- Policies are OR'd, so a user can read: any public event, PLUS any event
-- they're personally signed up for (which covers their private appointments).
drop policy if exists "Public read access" on public.events;

drop policy if exists "Public events readable by anyone" on public.events;
create policy "Public events readable by anyone"
  on public.events
  for select
  to anon, authenticated
  using (visibility = 'public');

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

-- 3) Make the two test events private (they'll drop off the dashboard but
-- remain on the personal calendar of anyone signed up for them).
update public.events
set visibility = 'private'
where name in ('Donut Wednesday', 'Doctor Appointment');
