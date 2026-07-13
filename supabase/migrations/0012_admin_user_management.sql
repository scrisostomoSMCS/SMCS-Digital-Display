-- SMCS — admin user management. Admins can view all users and change roles,
-- replacing the manual SQL role updates. Run in Supabase SQL Editor.

-- 1) profiles RLS: admins can read all rows and update roles. (Defense in depth
-- alongside the RPCs below. current_user_role() is SECURITY DEFINER, so no
-- recursive policy evaluation.)
drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles"
  on public.profiles for select
  to authenticated
  using (public.current_user_role() = 'admin');

drop policy if exists "Admins update profiles" on public.profiles;
create policy "Admins update profiles"
  on public.profiles for update
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- 2) List users with their email. Email lives in auth.users, which isn't exposed
-- to the client API, so this SECURITY DEFINER function joins it in and enforces
-- admin-only access internally.
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  role text,
  full_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Only admins can list users';
  end if;
  return query
    select p.id, u.email::text, p.role, p.full_name, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

-- 3) Change a user's role, with guardrails enforced in the database (the real
-- source of truth; the UI mirrors these for a good experience).
create or replace function public.admin_update_user_role(
  target_user_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_current_role text;
  admin_count int;
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Only admins can change roles';
  end if;

  if new_role not in ('client', 'employee', 'admin') then
    raise exception 'Invalid role: %', new_role;
  end if;

  -- An admin can't remove their own admin access.
  if target_user_id = auth.uid() and new_role <> 'admin' then
    raise exception 'You cannot remove your own admin access';
  end if;

  select role into target_current_role
  from public.profiles where id = target_user_id;
  if target_current_role is null then
    raise exception 'User not found';
  end if;

  -- Never demote the last remaining admin.
  if target_current_role = 'admin' and new_role <> 'admin' then
    select count(*) into admin_count from public.profiles where role = 'admin';
    if admin_count <= 1 then
      raise exception 'Cannot demote the last remaining admin';
    end if;
  end if;

  update public.profiles set role = new_role where id = target_user_id;
end;
$$;

revoke all on function public.admin_update_user_role(uuid, text) from public, anon;
grant execute on function public.admin_update_user_role(uuid, text) to authenticated;
