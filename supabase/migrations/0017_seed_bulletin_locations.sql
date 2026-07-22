-- SMCS: replace the placeholder "Dentist Building" display location with the
-- five real bulletin screens. "All locations" is not a row; it is the absence
-- of location rows for a page or slide, so it needs no seeding here.
-- Run this in the Supabase SQL Editor after 0016.

insert into public.bulletin_locations (name, slug)
values
  ('Family Shelter Cafeteria', 'family-shelter-cafeteria'),
  ('Zeider Housing Lobby',     'zeider-housing-lobby'),
  ('Dining Hall',              'dining-hall'),
  ('Mens Hygiene',             'mens-hygiene'),
  ('Womens Hygiene',           'womens-hygiene')
on conflict do nothing;

-- Drop the placeholder together with any page/slide targeting that referenced
-- it; those assignments fall back to appearing at all locations.
delete from public.builtin_page_locations
where location_id in (
  select id from public.bulletin_locations where lower(name) like '%dentist%'
);

delete from public.slide_locations
where location_id in (
  select id from public.bulletin_locations where lower(name) like '%dentist%'
);

delete from public.bulletin_locations where lower(name) like '%dentist%';
