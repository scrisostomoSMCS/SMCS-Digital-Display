-- SMCS, which deploy each wall TV is running, for /manage/health. The bulletin
-- reloads itself onto new code at a slide switch (BuildVersionWatcher); this
-- lets staff see which screens are still on old code.
--
-- screens.build_version is the commit SHA the TV's page was built from, sent
-- with every check-in. Null means the screen has not reported one: either it
-- has never checked in since this migration, or it is still running code from
-- before this feature (which can't update itself, so reload that TV once).
--
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. DEV PROJECT FIRST,
-- then production BEFORE deploying the code that sends p_build_version. (The
-- app retries without it if the RPC rejects the new argument, so the wrong
-- order costs the version column, not the check-in.) Run after 0032. Safe to
-- re-run. Builds on 0026 (screens, screen_heartbeat).

alter table public.screens
  add column if not exists build_version text
    check (build_version is null or char_length(build_version) <= 64);

-- No grant change: staff already have table-level SELECT, and their UPDATE
-- grant (0026) names only name and location_id, so like the check-in times this
-- column is written only by screen_heartbeat below.

-- Replaces 0026's two-argument version. The old one must go: with both
-- present, PostgREST can't choose between them for a two-argument call.
-- p_build_version defaults to null, so a screen still running pre-0033 code
-- keeps checking in fine, and is recorded as not reporting a version.
drop function if exists public.screen_heartbeat(text, boolean);

create or replace function public.screen_heartbeat(
  p_screen_id     text,
  p_content_ok    boolean default false,
  p_build_version text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.screens
     set last_seen = now(),
         last_content_sync = case when p_content_ok then now() else last_content_sync end,
         build_version = left(p_build_version, 64)
   where id = p_screen_id;
$$;

revoke all on function public.screen_heartbeat(text, boolean, text) from public;
grant execute on function public.screen_heartbeat(text, boolean, text) to anon, authenticated;
