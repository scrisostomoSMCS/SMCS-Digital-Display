-- SMCS, "last updated" tracking for staff-editable bulletin content.
-- The manage page shows employees when each custom slide and the shared
-- built-in pages were last changed. That timestamp must come from the DATABASE
-- clock, never from a staff laptop: two people editing from machines whose
-- clocks disagree by minutes would otherwise produce a slide that claims it was
-- updated in the future. So the value is stamped by a trigger here, and the
-- app code that used to pass updated_at by hand no longer does.
--
-- Nothing here is read by the public /information display; only /manage renders
-- these values.
--
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. DEV PROJECT FIRST.
-- Safe to re-run.

-- 1) The stamper. One function for every table, so "updated_at" can never mean
-- two different things in two places.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 2) slides needs the column. Added WITHOUT a default first, on purpose: a
-- column created as `default now()` backfills every existing row with the
-- migration's timestamp, so hundreds of slides nobody has touched in months
-- would all read "Updated just now". Existing rows stay NULL instead, which the
-- manage page renders as nothing at all rather than a time it cannot vouch for.
-- The default is attached afterwards so rows inserted from here on are tracked.
alter table public.slides add column if not exists updated_at timestamptz;
alter table public.slides alter column updated_at set default now();

-- 3) The slides trigger.
--
-- `update of <content columns>` is load-bearing. It deliberately omits:
--   * position - dragging one slide in the manage list rewrites `position` on
--     EVERY slide (persistSlideOrder in lib/slides.ts), which with a plain
--     `before update` trigger would restamp the whole rotation as just-edited.
--   * hidden - soft-deleting or restoring a slide is not an edit to its
--     content, and a restored slide should still report when its text last
--     changed.
-- Postgres fires `update of` when a column appears in the statement's SET list,
-- so the position-only and hidden-only writes never reach this trigger.
drop trigger if exists slides_set_updated_at on public.slides;
create trigger slides_set_updated_at
  before update of
    template, background, title, title_es, body, body_es,
    items, items_es, caption, caption_es, image_path
  on public.slides
  for each row execute function public.set_updated_at();

-- 4) The two singleton config rows already carry updated_at (0006 and 0008),
-- but only because application code remembered to pass it. Give them the
-- trigger so the database owns the value. info_content holds ALL of the
-- built-in bulletin pages in one JSON blob, so this is one timestamp covering
-- the shared pages together - the manage page presents it that way rather than
-- inventing a per-page time it has no history for.
drop trigger if exists info_content_set_updated_at on public.info_content;
create trigger info_content_set_updated_at
  before update on public.info_content
  for each row execute function public.set_updated_at();

drop trigger if exists display_settings_set_updated_at on public.display_settings;
create trigger display_settings_set_updated_at
  before update on public.display_settings
  for each row execute function public.set_updated_at();

-- 5) Deliberately NOT tracked here:
--   * events - the calendar is not a list of editable items on the manage page.
--   * slide_locations / builtin_page_locations - changing which locations show
--     a slide or page is targeting, not a content edit, so it does not touch
--     the parent row's updated_at.
--   * bulletin_locations - only ever created and deleted, never updated.
--   * announcements - written only by the RPCs in 0022 and live for 5 minutes.
