-- SMCS, "Weekly Menu" custom slide template.
-- Adds slides.menu: the structured week of Breakfast / Lunch / Dinner for the
-- new "weekly-menu" template. Shape (see src/lib/weeklyMenu.ts):
--   { "weekOf": "YYYY-MM-DD",
--     "days": { "mon": { "breakfast": { "items": [...], "itemsEs": [...] },
--                        "lunch": {...}, "dinner": {...} },
--               "tue": {...}, ... "sun": {...} } }
-- NULL for every other template. The template name itself needs no change:
-- slides.template has no check constraint. Existing RLS on slides (0007) is
-- row-level, so it already covers this column; slide_locations targeting
-- applies to menu slides like any other.
--
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. DEV PROJECT FIRST,
-- then production BEFORE deploying the code that reads this column (the app
-- selects `menu`, and without it every custom slide fails to load).
-- Safe to re-run.

alter table public.slides add column if not exists menu jsonb;

-- Keep "Updated X ago" honest for menu edits: menu joins the content-column
-- list of the 0023 trigger. position and hidden stay off it on purpose (see
-- 0023 for why).
drop trigger if exists slides_set_updated_at on public.slides;
create trigger slides_set_updated_at
  before update of
    template, background, title, title_es, body, body_es,
    items, items_es, caption, caption_es, image_path, menu
  on public.slides
  for each row execute function public.set_updated_at();
