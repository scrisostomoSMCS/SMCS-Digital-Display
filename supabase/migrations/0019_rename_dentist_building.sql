-- SMCS: the display location stored as "Denstistbuilding" is missing its space
-- (and has the letters transposed). Rename it in place -- name and slug -- so
-- the manage page reads cleanly.
--
-- The bulletin URL for that screen changes with the slug:
--   old: /information?location=denstistbuilding
--   new: /information?location=dentist-building
-- Re-open the new URL on that display after running this. Nothing currently
-- targets this location, so no page or slide assignments are affected.
--
-- Run this in the Supabase SQL Editor after 0018.

update public.bulletin_locations
set name = 'Dentist Building',
    slug = 'dentist-building'
where slug = 'denstistbuilding';
