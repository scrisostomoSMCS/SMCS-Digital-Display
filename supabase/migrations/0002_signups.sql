-- SMCS personal calendar — signups join table (which user is signed up for
-- which event), with strict row-ownership RLS so a user sees ONLY their own.
-- Run in Supabase: SQL Editor → New query → paste → Run.

-- 1) Join table ------------------------------------------------------------
create table if not exists public.signups (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  event_id   uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create index if not exists signups_user_id_idx on public.signups (user_id);

-- 2) Row Level Security: a user may READ only their own signups. No client
-- writes (admins assign people in a later phase via a privileged path).
alter table public.signups enable row level security;

drop policy if exists "Users read own signups" on public.signups;
create policy "Users read own signups"
  on public.signups
  for select
  to authenticated
  using (user_id = auth.uid());

-- 3) Realtime so the personal calendar updates itself when signups change.
alter publication supabase_realtime add table public.signups;

-- 4) Seed: sign the test account up for a few of this week's events so the
-- personal calendar isn't empty. Looks the user up by email (runs as the
-- privileged SQL role, so it bypasses RLS). Safe to re-run.
insert into public.signups (user_id, event_id)
select u.id, e.id
from auth.users u
cross join public.events e
where u.email = 'moresoup11@gmail.com'
  and e.name in ('Sunday Service', 'Bible Study', 'Food Bank', 'Evening Concert')
on conflict (user_id, event_id) do nothing;
