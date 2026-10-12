-- SMCS, Lost & Found only: removes the mail call half of 0028.
-- The bulletin slide no longer lists client names at all, so the table loses
-- its name column and its "mail" kind, and is renamed to what it now holds.
--   mail_call_entries          -> lost_found_items
--   purge_expired_mail_call()  -> purge_expired_lost_found()
-- Every remaining row is a found item: what it is, when it was found, which
-- building has it, and when it comes down. Nothing about a person.
--
-- Run in Supabase: SQL Editor -> New query -> paste -> Run, AFTER 0028.
-- DEV PROJECT FIRST, then production BEFORE deploying the code that reads
-- lost_found_items. Safe to re-run.

-- 1) Rename the table (keeps its rows, index, RLS, grants, and Realtime
-- publication membership, which all follow the table, not its name).
do $$
begin
  if to_regclass('public.mail_call_entries') is not null
     and to_regclass('public.lost_found_items') is null then
    -- Names never survive this migration, whatever happens below.
    delete from public.mail_call_entries where kind = 'mail';
    alter table public.mail_call_entries rename to lost_found_items;
  end if;
end $$;

-- 2) Drop the mail shape and the name column. The old check constraint
-- mentions display_name, so it goes first.
alter table public.lost_found_items drop constraint if exists mail_call_shape;
do $$
begin
  -- Guarded so a re-run (after the column is gone) does not error.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lost_found_items' and column_name = 'kind'
  ) then
    delete from public.lost_found_items where kind is distinct from 'lost-found';
  end if;
end $$;
alter table public.lost_found_items drop column if exists display_name;
alter table public.lost_found_items drop column if exists kind;

-- 3) What a row must be now: an item of 1-50 characters and the date found.
alter table public.lost_found_items drop constraint if exists lost_found_shape;
alter table public.lost_found_items
  add constraint lost_found_shape check (
    item is not null
    and char_length(btrim(item)) between 1 and 50
    and found_on is not null
  );

-- Constraint and index names from 0028, renamed to match (cosmetic, guarded).
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'mail_call_item_es_length') then
    alter table public.lost_found_items
      rename constraint mail_call_item_es_length to lost_found_item_es_length;
  end if;
  if exists (select 1 from pg_constraint where conname = 'mail_call_expiry') then
    alter table public.lost_found_items
      rename constraint mail_call_expiry to lost_found_expiry;
  end if;
end $$;

drop index if exists public.mail_call_entries_location_idx;
create index if not exists lost_found_items_location_idx
  on public.lost_found_items (location_id, expires_at);

-- 4) Policies, recreated under names that match the table. Same rules as
-- 0028: anyone reads unexpired rows; staff add and remove; nobody edits.
drop policy if exists "Anyone reads live mail call entries" on public.lost_found_items;
drop policy if exists "Staff insert mail call entries" on public.lost_found_items;
drop policy if exists "Staff delete mail call entries" on public.lost_found_items;

drop policy if exists "Anyone reads live lost and found items" on public.lost_found_items;
create policy "Anyone reads live lost and found items"
  on public.lost_found_items for select
  to anon, authenticated
  using (expires_at > now());

drop policy if exists "Staff insert lost and found items" on public.lost_found_items;
create policy "Staff insert lost and found items"
  on public.lost_found_items for insert
  to authenticated
  with check (public.current_user_role() in ('employee', 'admin'));

drop policy if exists "Staff delete lost and found items" on public.lost_found_items;
create policy "Staff delete lost and found items"
  on public.lost_found_items for delete
  to authenticated
  using (public.current_user_role() in ('employee', 'admin'));

-- Column grants restated for the new column list (who added a row stays
-- hidden from anonymous readers).
revoke all on public.lost_found_items from anon;
grant select (id, item, item_es, found_on, location_id, expires_at, created_at)
  on public.lost_found_items to anon;
grant select, insert, delete on public.lost_found_items to authenticated;

-- 5) The purge function, renamed. Same rules as 0028's: SECURITY DEFINER
-- because expired rows are invisible through RLS; staff, pg_cron, or the SQL
-- Editor only (session_user, since current_user is always the owner here).
drop function if exists public.purge_expired_mail_call();

create or replace function public.purge_expired_lost_found()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  if coalesce(public.current_user_role(), '') not in ('employee', 'admin')
     and session_user not in ('postgres', 'supabase_admin') then
    raise exception 'Not authorized';
  end if;
  delete from public.lost_found_items where expires_at <= now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.purge_expired_lost_found() from public, anon;
grant execute on function public.purge_expired_lost_found() to authenticated;

-- 6) Realtime: the rename keeps membership, but a fresh project that somehow
-- lacks it gets it here. Guarded because re-adding errors.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'lost_found_items'
  ) then
    alter publication supabase_realtime add table public.lost_found_items;
  end if;
end $$;

-- 7) If you scheduled 0028's optional nightly purge, swap it for the renamed
-- function (uncomment both lines):
-- select cron.unschedule('purge-expired-mail-call');
-- select cron.schedule('purge-expired-lost-found', '15 3 * * *', $$ select public.purge_expired_lost_found(); $$);
