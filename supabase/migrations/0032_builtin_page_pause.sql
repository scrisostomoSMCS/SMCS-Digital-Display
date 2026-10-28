-- SMCS, "Hide slide" for the built-in Digital Bulletin pages (each "This Week's
-- Services" page, new arrivals, the featured group page, events today). The
-- custom-slide half is 0031 (slides.is_paused); built-in pages are not rows in
-- `slides`, so their paused state lives here instead.
--
-- display_settings.paused_pages holds bulletin PAGE KEYS, the same keys
-- builtin_page_locations (0016) uses: 'builtin:services:<page id>' for each
-- services page, 'builtin:new-arrivals' / 'builtin:demographic' /
-- 'builtin:events-today' for the fixed pages. Per services page, unlike
-- hidden_builtins (0008), which removes the whole page type and is the
-- "Recently deleted" list. A paused page keeps its editor and its content and
-- returns as soon as it is unpaused.
--
-- No RLS change: built-in page content is public in info_content already, and
-- the existing display_settings policies (0008) let anyone read and only staff
-- write. The screens already listen to display_settings over Realtime, so a
-- pause reaches them right away.
--
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. DEV PROJECT FIRST,
-- then production BEFORE deploying the code that reads this column. Run after
-- 0031. Safe to re-run.

alter table public.display_settings
  add column if not exists paused_pages text[] not null default '{}';

comment on column public.display_settings.paused_pages is
  'Built-in bulletin page keys staff have hidden with "Hide slide". Not the same as hidden_builtins (removed page types).';
