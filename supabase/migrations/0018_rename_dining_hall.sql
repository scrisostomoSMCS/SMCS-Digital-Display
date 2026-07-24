-- SMCS: the display location seeded in 0017 as "Dining Hall" is really the
-- Dining Room. Rename it in place so the page/slide targeting that already
-- points at this location is kept (deleting and re-adding would drop it).
--
-- The slug is deliberately left as 'dining-hall' so the bulletin URL already
-- open on that screen (/information?location=dining-hall) keeps working.
-- Run this in the Supabase SQL Editor after 0017.

update public.bulletin_locations
set name = 'Dining Room'
where slug = 'dining-hall';
