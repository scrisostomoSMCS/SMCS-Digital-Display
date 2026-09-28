-- SMCS, short-lived announcements for the Digital Bulletin (/information).
-- Staff push a message from the manage page; every wall screen overlays it for
-- five minutes, then it disappears on its own. English only.
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. DEV PROJECT ONLY.

-- 1) The table. `expires_at` is the single source of truth for "live": a row is
-- live while now() < expires_at. There is no status column and no delete, so an
-- announcement can never be resurrected by a clock change or a stale cache.
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  message    text not null check (char_length(btrim(message)) between 1 and 200),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_by uuid references auth.users (id) on delete set null
);

-- The display's only query is "the live one, newest first".
create index if not exists announcements_expires_at_idx
  on public.announcements (expires_at desc);

alter table public.announcements enable row level security;

-- 2) Reads. The wall display reads as `anon` (browser client, anon key), and it
-- may only ever see a live row. now() is evaluated by the DATABASE on every
-- read, so a TV with a wrong clock cannot widen its own window.
drop policy if exists "Anyone can read live announcements" on public.announcements;
create policy "Anyone can read live announcements"
  on public.announcements for select
  to anon, authenticated
  using (expires_at > now());

-- 3) Writes. Deliberately NO insert/update/delete policy for anybody: all writes
-- go through the two SECURITY DEFINER functions below, which set the timestamps
-- from the database clock and enforce the one-live-at-a-time rule atomically.
-- (Same shape as the admin RPCs in 0012.) A staff laptop and a wall screen can
-- disagree about the time by minutes; neither is ever consulted here.

-- Push a new announcement, expiring any currently live one in the same
-- transaction so there is never an instant with two live rows.
create or replace function public.push_announcement(p_message text)
returns public.announcements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message text;
  v_row public.announcements;
begin
  if public.current_user_role() not in ('employee', 'admin') then
    raise exception 'Only staff can push announcements';
  end if;

  -- Serializes concurrent pushes (a double-click that beat the UI's disabled
  -- state, or two staff at once). Without it, two transactions could each see
  -- the other's row as not-yet-expired and both insert. Released at commit.
  perform pg_advisory_xact_lock(hashtext('smcs_announcements'));

  -- Server-side revalidation of the 200-character limit the modal enforces in
  -- the textarea. The UI limit is a convenience; this is the rule.
  v_message := btrim(coalesce(p_message, ''));
  if v_message = '' then
    raise exception 'An announcement needs a message';
  end if;
  if char_length(v_message) > 200 then
    raise exception 'An announcement can be at most 200 characters';
  end if;

  -- now() is the transaction timestamp, so the row retired here and the row
  -- inserted below share one instant: the old one stops being live at exactly
  -- the moment the new one starts.
  update public.announcements
     set expires_at = now()
   where expires_at > now();

  insert into public.announcements (message, expires_at, created_by)
  values (v_message, now() + interval '5 minutes', auth.uid())
  returning * into v_row;

  return v_row;
end;
$$;

-- "End Now": retire whatever is live. A no-op if nothing is.
create or replace function public.end_announcement()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() not in ('employee', 'admin') then
    raise exception 'Only staff can end announcements';
  end if;

  perform pg_advisory_xact_lock(hashtext('smcs_announcements'));

  update public.announcements
     set expires_at = now()
   where expires_at > now();
end;
$$;

revoke all on function public.push_announcement(text) from public, anon;
revoke all on function public.end_announcement() from public, anon;
grant execute on function public.push_announcement(text) to authenticated;
grant execute on function public.end_announcement() to authenticated;

-- 4) Realtime, so a pushed announcement reaches the wall screens in about a
-- second instead of waiting for the display's ten-minute backstop poll. Guarded
-- because re-adding a table already in the publication is an error, and these
-- migrations are meant to be safe to re-run.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'announcements'
  ) then
    alter publication supabase_realtime add table public.announcements;
  end if;
end;
$$;
