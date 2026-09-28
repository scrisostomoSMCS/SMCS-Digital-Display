-- SMCS, staff-chosen names for the manage page's sidebar entries.
-- Run in Supabase SQL Editor. Builds on 0008 (display_settings).
--
-- Double-clicking a slide name in the /manage sidebar renames it. The name is a
-- manage-page label only: it never reaches the wall display, so it is kept
-- apart from the slides' own titles. Keyed by page key
-- ("builtin:new-arrivals", "builtin:services:<page id>", "slide:<slide id>");
-- a missing key means "use the default name".
alter table public.display_settings
  add column if not exists sidebar_names jsonb not null default '{}'::jsonb;
