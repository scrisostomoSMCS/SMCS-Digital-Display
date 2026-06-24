-- SMCS dashboard — events schema, public read-only access, realtime, + seed.
-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run.

-- 1) Table -----------------------------------------------------------------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  location    text,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  all_day     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- 2) Row Level Security: anyone may READ, no one may write via the public API.
-- (Inserts/updates come later from an authenticated admin screen.)
alter table public.events enable row level security;

drop policy if exists "Public read access" on public.events;
create policy "Public read access"
  on public.events
  for select
  to anon, authenticated
  using (true);

-- 3) Realtime: let the dashboard receive live changes.
alter publication supabase_realtime add table public.events;

-- 4) Seed sample rows anchored to the CURRENT week (Sunday start) so the
-- dashboard isn't empty. Safe to delete later; re-running duplicates the rows.
insert into public.events (name, description, location, starts_at, ends_at)
select
  v.name, v.description, v.location,
  base.sun + v.day_offset + v.start_t,
  base.sun + v.day_offset + v.end_t
from (
  select (date_trunc('week', now()) - interval '1 day')::date as sun
) base
cross join (values
  ('Sunday Service',     'Weekly community gathering. All welcome.',      'Main Hall',       0, interval '9 hour',            interval '10 hour 30 minute'),
  ('Community Lunch',    'Free lunch, open to everyone.',                 'Dining Room',     1, interval '12 hour',           interval '13 hour 30 minute'),
  ('Youth Group',        'For ages 12-18.',                              'Room B',          2, interval '16 hour',           interval '17 hour 30 minute'),
  ('Volunteer Meeting',  null,                                            'Conference Room', 2, interval '18 hour',           interval '19 hour'),
  ('Bible Study',        'Bring your own copy.',                          'Library',         3, interval '10 hour',           interval '11 hour'),
  ('Food Bank',          'Distribution and intake.',                      'Annex',           4, interval '9 hour 30 minute',  interval '12 hour'),
  ('Evening Concert',    'Local choir performance.',                      'Main Hall',       5, interval '18 hour',           interval '19 hour 30 minute'),
  ('Community Breakfast', 'Pancakes and coffee to start the weekend.',    'Dining Room',     6, interval '9 hour',            interval '10 hour 30 minute')
) as v(name, description, location, day_offset, start_t, end_t);
