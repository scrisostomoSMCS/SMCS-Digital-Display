-- SMCS, per-page "Show weather" switch for the "This Week's Services" pages.
-- Each services page is an object inside the info_content singleton (0006):
--   content.services.pages[i] = { "id", "title", "titleEs", "services": [...] }
-- This adds "showWeather": true to every page object that does not have the
-- key yet, so existing pages keep showing the forecast pill until staff turn
-- it off. There is no column to give a default: the setting rides inside the
-- page, saved by the same route and covered by the same RLS (staff-only
-- update, 0006) and Realtime publication as the rest of the page's text.
--
-- The app also reads a missing or non-boolean showWeather as ON (see
-- normalizeServices in src/lib/infoContent.ts), which covers pages added
-- later and any older saved shape this statement deliberately leaves alone
-- (it only rewrites services.pages when that is an array of page objects).
--
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. DEV PROJECT FIRST,
-- then production BEFORE deploying the code that reads showWeather. Safe to
-- re-run: a second run finds no page missing the key and updates nothing
-- (so it does not bump updated_at or nudge the wall displays again).

update public.info_content
set content = jsonb_set(
  content,
  '{services,pages}',
  (
    select jsonb_agg(
      case
        when jsonb_typeof(page) = 'object' and not (page ? 'showWeather')
          then page || '{"showWeather": true}'::jsonb
        else page
      end
      order by position
    )
    from jsonb_array_elements(content -> 'services' -> 'pages')
      with ordinality as pages(page, position)
  )
)
where id = 1
  and jsonb_typeof(content -> 'services' -> 'pages') = 'array'
  and jsonb_array_length(content -> 'services' -> 'pages') > 0
  and exists (
    select 1
    from jsonb_array_elements(content -> 'services' -> 'pages') as pages(page)
    where jsonb_typeof(page) = 'object' and not (page ? 'showWeather')
  );
