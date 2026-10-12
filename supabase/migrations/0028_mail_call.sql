-- SMCS, Mail Call / Lost & Found entries for the Digital Bulletin.
-- Feeds the "mail-call" custom slide template, which is behind the
-- SHOW_MAIL_CALL flag in src/lib/siteConfig.ts (OFF by default). With the flag
-- off nothing reads or writes this table, so this migration can wait until
-- staff have signed off on the privacy rules below.
--
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. DEV PROJECT FIRST,
-- then production BEFORE turning the flag on. Safe to re-run. Builds on 0005
-- (current_user_role) and 0015 (bulletin_locations).
--
-- PRIVACY RULES, ENFORCED HERE RATHER THAN ONLY IN THE UI:
--   * A mail entry's name must be a first name plus a last initial ("Maria G.").
--     The check constraint rejects anything else, whatever client writes it.
--   * Lost & found entries carry an item and a found date, never a name.
--   * There are no columns for anything else identifying (no date of birth,
--     case number, bed number, full last name).
--   * Every entry expires, at most 30 days after it is created. Expired rows
--     are invisible to EVERY reader through RLS, so a stale name cannot be read
--     from the public API even before it is deleted. purge_expired_mail_call()
--     removes them; staff call it from the manage page, and the optional
--     pg_cron block at the bottom runs it nightly.
--   * Every entry belongs to exactly one bulletin location and is only shown
--     on that location's screens (the app filters by ?location=). NOTE: this
--     limits where names are DISPLAYED, not who can read them — the table is
--     readable anonymously, like every bulletin table, because the wall
--     screens are not signed in.

-- 1) The table.
create table if not exists public.mail_call_entries (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('mail', 'lost-found')),
  display_name text,
  item         text,
  item_es      text not null default '',
  found_on     date,
  location_id  uuid not null references public.bulletin_locations (id) on delete cascade,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  created_by   uuid default auth.uid() references public.profiles (id) on delete set null,

  -- Mail: a name in the "First L." form and nothing else. Lost & found: an
  -- item and the date it was found, and never a name. Letters are spelled out
  -- as Latin ranges (accents included: "José R.") rather than [[:alpha:]],
  -- whose meaning depends on the database locale. Same pattern as
  -- MAIL_CALL_NAME_RE in src/lib/mailCall.ts.
  constraint mail_call_shape check (
    (kind = 'mail'
      and display_name ~ '^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ''’-]{0,19} [A-ZÀ-ÖØ-Þ]\.$'
      and item is null and found_on is null)
    or
    (kind = 'lost-found'
      and display_name is null
      and item is not null and char_length(btrim(item)) between 1 and 50
      and found_on is not null)
  ),
  constraint mail_call_item_es_length check (char_length(item_es) <= 80),
  -- The app offers at most 30 days and computes the time on the staff
  -- laptop; the extra day is slack for a laptop clock that runs fast.
  constraint mail_call_expiry check (
    expires_at > created_at and expires_at <= created_at + interval '31 days'
  )
);

create index if not exists mail_call_entries_location_idx
  on public.mail_call_entries (location_id, kind, expires_at);

alter table public.mail_call_entries enable row level security;

-- 2) Reads: anyone, but only entries that have not expired. Applies to staff
-- too; the manage page never needs to see an expired name.
drop policy if exists "Anyone reads live mail call entries" on public.mail_call_entries;
create policy "Anyone reads live mail call entries"
  on public.mail_call_entries for select
  to anon, authenticated
  using (expires_at > now());

-- 3) Writes: staff only. No update policy: an entry is added or removed, never
-- edited, so a name cannot be changed after the fact into something the
-- constraint would have rejected at insert.
drop policy if exists "Staff insert mail call entries" on public.mail_call_entries;
create policy "Staff insert mail call entries"
  on public.mail_call_entries for insert
  to authenticated
  with check (public.current_user_role() in ('employee', 'admin'));

drop policy if exists "Staff delete mail call entries" on public.mail_call_entries;
create policy "Staff delete mail call entries"
  on public.mail_call_entries for delete
  to authenticated
  using (public.current_user_role() in ('employee', 'admin'));

-- Who added an entry is for the database, not the public: anonymous readers get
-- every column except created_by.
revoke all on public.mail_call_entries from anon;
grant select (id, kind, display_name, item, item_es, found_on, location_id, expires_at, created_at)
  on public.mail_call_entries to anon;
grant select, insert, delete on public.mail_call_entries to authenticated;

-- 4) Purge expired rows. SECURITY DEFINER because expired rows are invisible
-- through RLS, so a normal DELETE could never reach them; the role check keeps
-- it staff-only.
create or replace function public.purge_expired_mail_call()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  -- session_user, not current_user: inside SECURITY DEFINER current_user is
  -- always the owner. The API connects as 'authenticator'; pg_cron and the SQL
  -- Editor connect as postgres.
  if coalesce(public.current_user_role(), '') not in ('employee', 'admin')
     and session_user not in ('postgres', 'supabase_admin') then
    raise exception 'Not authorized';
  end if;
  delete from public.mail_call_entries where expires_at <= now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.purge_expired_mail_call() from public, anon;
grant execute on function public.purge_expired_mail_call() to authenticated;

-- 5) Realtime, so an added or removed entry reaches the screens in about a
-- second. Guarded because re-adding a table already in the publication errors.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'mail_call_entries'
  ) then
    alter publication supabase_realtime add table public.mail_call_entries;
  end if;
end $$;

-- 6) OPTIONAL nightly purge, if the pg_cron extension is enabled on this
-- project (Database -> Extensions). Uncomment and run once.
-- select cron.schedule(
--   'purge-expired-mail-call',
--   '15 3 * * *',
--   $$ select public.purge_expired_mail_call(); $$
-- );
