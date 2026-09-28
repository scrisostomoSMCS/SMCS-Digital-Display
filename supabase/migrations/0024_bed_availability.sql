-- SMCS, live bed availability for the Digital Bulletin panel and the home-page
-- popup. Replaces the WordPress /wp-json/smcs/v1/beds feed: staff edit counts
-- on /manage, the public display reads them anonymously and updates through
-- Realtime.
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. DEV PROJECT FIRST,
-- then production. Safe to re-run. Builds on 0005 (profiles, current_user_role).

-- 1) The table. One row per displayed count; rows sharing program_key render
-- as one program line ("TAY: 5 Male beds available, 0 Female beds available").
create table if not exists public.bed_availability (
  id            text primary key,
  program_key   text not null,
  program_label text not null,
  label         text not null,
  count         integer not null default 0 check (count >= 0),
  position      integer not null,
  updated_at    timestamptz,
  updated_by    uuid references public.profiles (id) on delete set null
);

alter table public.bed_availability enable row level security;

-- 2) Who/when is stamped by the DATABASE, never sent from the browser, so a
-- staff laptop with a wrong clock cannot misdate the public "as of" line.
--
-- Deliberately fires on every write to count, even when the number is
-- unchanged: the manage page's "Update" button writes every row, and that is
-- how staff tell the public "these counts are still current as of today".
create or replace function public.set_bed_availability_audit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists bed_availability_audit on public.bed_availability;
create trigger bed_availability_audit
  before update of count on public.bed_availability
  for each row execute function public.set_bed_availability_audit();

-- 3) Reads: anyone. The wall display and the home page read as `anon`.
drop policy if exists "Anyone can read bed availability" on public.bed_availability;
create policy "Anyone can read bed availability"
  on public.bed_availability for select
  to anon, authenticated
  using (true);

-- 4) Writes: staff may UPDATE, and only the count column (the column grant
-- below). No insert/delete policy: the program list and labels change through
-- migrations, not the UI.
drop policy if exists "Staff update bed availability" on public.bed_availability;
create policy "Staff update bed availability"
  on public.bed_availability for update
  to authenticated
  using (public.current_user_role() in ('employee', 'admin'))
  with check (public.current_user_role() in ('employee', 'admin'));

revoke insert, update, delete on public.bed_availability from anon, authenticated;
grant select on public.bed_availability to anon, authenticated;
grant update (count) on public.bed_availability to authenticated;

-- 5) Seed. Counts as published on September 25, 2026. `do nothing` so a
-- re-run never overwrites counts staff have entered since.
insert into public.bed_availability
  (id, program_key, program_label, label, count, position, updated_at)
values
  ('mens-lodge',        'mens-lodge',        'Men’s Lodge',                     'Available',               2, 10, '2026-09-25 12:00-07'),
  ('womens-lodge',      'womens-lodge',      'Women’s Lodge',                   'Available',               2, 20, '2026-09-25 12:00-07'),
  ('tay-male',          'tay',               'TAY',                             'Male beds available',     5, 30, '2026-09-25 12:00-07'),
  ('tay-female',        'tay',               'TAY',                             'Female beds available',   0, 31, '2026-09-25 12:00-07'),
  ('recuperative-care', 'recuperative-care', 'Recuperative Care Units',         'Available',               9, 40, '2026-09-25 12:00-07'),
  ('family-lodge',      'family-lodge',      'Family Lodge',                    'Available',               0, 50, '2026-09-25 12:00-07'),
  ('zeiter',            'zeiter',            'Zeiter Family Navigation Center', 'Available',               0, 60, '2026-09-25 12:00-07'),
  ('pathways-double',   'pathways',          'Pathways',                        'Double Rooms Available', 20, 70, '2026-09-25 12:00-07'),
  ('pathways-single',   'pathways',          'Pathways',                        'Single Rooms Available',  0, 71, '2026-09-25 12:00-07')
on conflict (id) do nothing;

-- 6) Realtime, so a saved count reaches the screens in about a second instead
-- of waiting for the display's backstop poll. Guarded because re-adding a
-- table already in the publication is an error.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bed_availability'
  ) then
    alter publication supabase_realtime add table public.bed_availability;
  end if;
end;
$$;
