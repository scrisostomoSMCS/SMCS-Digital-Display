-- SMCS, template-based custom slides + image storage + built-in slide hiding.
-- Run in Supabase SQL Editor. Builds on 0007 (slides table) and 0005 (roles).

-- 1) Extend slides with a layout template, caption, and an image reference.
alter table public.slides
  add column if not exists template   text not null default 'title-body',
  add column if not exists caption    text,
  add column if not exists image_path text;

-- 2) Which built-in slides (services / new-arrivals / demographic / events)
-- are hidden from the rotation. Lets employees "delete" a built-in slide
-- without losing its editor. Singleton row.
create table if not exists public.display_settings (
  id              int primary key default 1,
  hidden_builtins text[] not null default '{}',
  updated_at      timestamptz not null default now(),
  constraint display_settings_singleton check (id = 1)
);
alter table public.display_settings enable row level security;

drop policy if exists "Anyone reads display settings" on public.display_settings;
create policy "Anyone reads display settings"
  on public.display_settings for select to anon, authenticated using (true);

drop policy if exists "Staff insert display settings" on public.display_settings;
create policy "Staff insert display settings"
  on public.display_settings for insert to authenticated
  with check (public.current_user_role() in ('employee', 'admin'));

drop policy if exists "Staff update display settings" on public.display_settings;
create policy "Staff update display settings"
  on public.display_settings for update to authenticated
  using (public.current_user_role() in ('employee', 'admin'))
  with check (public.current_user_role() in ('employee', 'admin'));

-- Add to realtime only if not already a member (idempotent, so re-runs work).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'display_settings'
  ) then
    alter publication supabase_realtime add table public.display_settings;
  end if;
end $$;

-- 3) Storage bucket for slide images/logos. Public read (wall display is
-- public); only staff can upload/change/delete.
insert into storage.buckets (id, name, public)
values ('slide-images', 'slide-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read slide images" on storage.objects;
create policy "Public read slide images"
  on storage.objects for select
  using (bucket_id = 'slide-images');

drop policy if exists "Staff upload slide images" on storage.objects;
create policy "Staff upload slide images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'slide-images'
    and public.current_user_role() in ('employee', 'admin')
  );

drop policy if exists "Staff modify slide images" on storage.objects;
create policy "Staff modify slide images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'slide-images'
    and public.current_user_role() in ('employee', 'admin')
  );

drop policy if exists "Staff delete slide images" on storage.objects;
create policy "Staff delete slide images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'slide-images'
    and public.current_user_role() in ('employee', 'admin')
  );
