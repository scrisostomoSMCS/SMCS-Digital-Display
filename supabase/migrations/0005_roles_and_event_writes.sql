-- SMCS — roles (profiles) + employee/admin write access to events.
-- Run in Supabase: SQL Editor → New query → paste → Run.

-- 1) profiles: one row per auth user, carrying their role.
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'client'
             check (role in ('client', 'employee', 'admin')),
  full_name  text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile (role 'client') whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any users that already exist.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- 2) profiles RLS: a user may read their own profile (used to gate the UI).
alter table public.profiles enable row level security;

drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- 3) Role helper. SECURITY DEFINER so it can read profiles inside RLS policies
-- without recursion / needing a profiles read policy for the row being checked.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- 4) Events write access for staff. Reads stay as-is (public dashboard events +
-- a user's own signups); we ADD: staff can read ALL events and create/update/
-- delete them. RLS is the real enforcement — the editing UI is convenience.
drop policy if exists "Staff read all events" on public.events;
create policy "Staff read all events"
  on public.events for select
  to authenticated
  using (public.current_user_role() in ('employee', 'admin'));

drop policy if exists "Staff insert events" on public.events;
create policy "Staff insert events"
  on public.events for insert
  to authenticated
  with check (public.current_user_role() in ('employee', 'admin'));

drop policy if exists "Staff update events" on public.events;
create policy "Staff update events"
  on public.events for update
  to authenticated
  using (public.current_user_role() in ('employee', 'admin'))
  with check (public.current_user_role() in ('employee', 'admin'));

drop policy if exists "Staff delete events" on public.events;
create policy "Staff delete events"
  on public.events for delete
  to authenticated
  using (public.current_user_role() in ('employee', 'admin'));

-- 5) Make the employee account a staff member so it can use the editor.
-- moresoup11 stays the default 'client' (use it to demo the /manage redirect).
update public.profiles p
set role = 'employee'
from auth.users u
where p.id = u.id and u.email = 'moresoup13@gmail.com';
