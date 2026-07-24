-- SMCS: the display location seeded in 0017 as "Dining Hall" is really the
-- Dining Room. Rename it in place -- name and slug -- so the page/slide
-- targeting already pointing at this location is kept (deleting and re-adding
-- would drop it).
--
-- The bulletin URL for that screen changes with the slug:
--   old: /information?location=dining-hall
--   new: /information?location=dining-room
-- Re-open the new URL on the Dining Room display after running this. A screen
-- left on the old URL still shows the bulletin, but only the slides set to
-- "All locations" -- anything targeted at the Dining Room stops appearing.
--
-- Run this in the Supabase SQL Editor after 0017.

update public.bulletin_locations
set name = 'Dining Room',
    slug = 'dining-room'
where slug = 'dining-hall';
