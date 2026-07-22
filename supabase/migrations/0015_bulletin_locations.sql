-- SMCS: location-specific Digital Bulletin rotations. A custom slide with no
-- rows in slide_locations remains global and appears on every display. Adding
-- one or more rows targets that slide to only those locations.

create table if not exists public.bulletin_locations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) between 1 and 80),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

create unique index if not exists bulletin_locations_name_lower_idx
  on public.bulletin_locations (lower(name));

create table if not exists public.slide_locations (
  slide_id    uuid not null references public.slides(id) on delete cascade,
  location_id uuid not null references public.bulletin_locations(id),
  primary key (slide_id, location_id)
);

create index if not exists slide_locations_location_idx
  on public.slide_locations (location_id);

alter table public.bulletin_locations enable row level security;
alter table public.slide_locations enable row level security;

drop policy if exists "Anyone can read bulletin locations" on public.bulletin_locations;
create policy "Anyone can read bulletin locations"
  on public.bulletin_locations for select
  to anon, authenticated
  using (true);

drop policy if exists "Staff insert bulletin locations" on public.bulletin_locations;
create policy "Staff insert bulletin locations"
  on public.bulletin_locations for insert
  to authenticated
  with check (public.current_user_role() in ('employee', 'admin'));

drop policy if exists "Staff update bulletin locations" on public.bulletin_locations;
create policy "Staff update bulletin locations"
  on public.bulletin_locations for update
  to authenticated
  using (public.current_user_role() in ('employee', 'admin'))
  with check (public.current_user_role() in ('employee', 'admin'));

drop policy if exists "Staff delete bulletin locations" on public.bulletin_locations;
create policy "Staff delete bulletin locations"
  on public.bulletin_locations for delete
  to authenticated
  using (public.current_user_role() in ('employee', 'admin'));

drop policy if exists "Anyone can read slide locations" on public.slide_locations;
create policy "Anyone can read slide locations"
  on public.slide_locations for select
  to anon, authenticated
  using (true);

drop policy if exists "Staff insert slide locations" on public.slide_locations;
create policy "Staff insert slide locations"
  on public.slide_locations for insert
  to authenticated
  with check (public.current_user_role() in ('employee', 'admin'));

drop policy if exists "Staff delete slide locations" on public.slide_locations;
create policy "Staff delete slide locations"
  on public.slide_locations for delete
  to authenticated
  using (public.current_user_role() in ('employee', 'admin'));

-- Keep location and assignment changes live on already-open manage/display pages.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bulletin_locations'
  ) then
    alter publication supabase_realtime add table public.bulletin_locations;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'slide_locations'
  ) then
    alter publication supabase_realtime add table public.slide_locations;
  end if;
end $$;
