-- SMCS: location targeting for every built-in Digital Bulletin page. Service
-- pages use stable IDs stored in info_content; the other pages use fixed keys.
-- A page with no rows remains visible at all locations.

create table if not exists public.builtin_page_locations (
  page_key    text not null check (char_length(page_key) between 1 and 150),
  location_id uuid not null references public.bulletin_locations(id),
  primary key (page_key, location_id)
);

create index if not exists builtin_page_locations_location_idx
  on public.builtin_page_locations (location_id);

alter table public.builtin_page_locations enable row level security;

drop policy if exists "Anyone can read built-in page locations"
  on public.builtin_page_locations;
create policy "Anyone can read built-in page locations"
  on public.builtin_page_locations for select
  to anon, authenticated
  using (true);

drop policy if exists "Staff insert built-in page locations"
  on public.builtin_page_locations;
create policy "Staff insert built-in page locations"
  on public.builtin_page_locations for insert
  to authenticated
  with check (public.current_user_role() in ('employee', 'admin'));

drop policy if exists "Staff delete built-in page locations"
  on public.builtin_page_locations;
create policy "Staff delete built-in page locations"
  on public.builtin_page_locations for delete
  to authenticated
  using (public.current_user_role() in ('employee', 'admin'));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'builtin_page_locations'
  ) then
    alter publication supabase_realtime add table public.builtin_page_locations;
  end if;
end $$;
