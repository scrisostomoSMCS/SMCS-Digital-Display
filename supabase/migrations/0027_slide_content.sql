-- SMCS, structured content for the newer custom slide templates.
-- Adds slides.content: one jsonb blob whose shape depends on slides.template,
-- shared by every template added after "weekly-menu" instead of one column
-- per template. Each shape is documented, parsed, and cleaned in its own pure
-- module under src/lib (first: "event-flyer", see src/lib/eventFlyer.ts):
--   event-flyer: { "date": "YYYY-MM-DD", "startTime": "HH:MM",
--                  "endTime": "HH:MM", "location": "...", "locationEs": "..." }
-- NULL for templates that do not use it. Readers never trust the shape: a
-- malformed or wrong-template blob parses to empty values, never an error.
-- Existing RLS on slides (0007) is row-level and already covers this column;
-- slide_locations targeting applies as usual.
--
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. DEV PROJECT FIRST,
-- then production BEFORE deploying the code that reads this column (the app
-- selects `content`, and without it every custom slide fails to load).
-- Safe to re-run.

alter table public.slides add column if not exists content jsonb;

-- Keep "Updated X ago" honest for content edits: content joins the
-- content-column list of the 0023/0025 trigger. position and hidden stay off
-- it on purpose (see 0023 for why).
drop trigger if exists slides_set_updated_at on public.slides;
create trigger slides_set_updated_at
  before update of
    template, background, title, title_es, body, body_es,
    items, items_es, caption, caption_es, image_path, menu, content
  on public.slides
  for each row execute function public.set_updated_at();
