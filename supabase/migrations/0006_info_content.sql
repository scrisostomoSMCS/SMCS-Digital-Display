-- SMCS — editable content for the /information wall display.
-- One singleton row holds a JSON blob of the three messaging pages' text
-- (services overview, new arrivals, demographic). The public display reads it;
-- only employees/admins can write it. The "Events happening today" page is NOT
-- stored here — it's driven live by the events table.
-- Run in Supabase: SQL Editor → New query → paste → Run.

create table if not exists public.info_content (
  id         int primary key default 1,
  content    jsonb not null,
  updated_at timestamptz not null default now(),
  constraint info_content_singleton check (id = 1)
);

alter table public.info_content enable row level security;

-- Public (the wall display, anon) can read the content.
drop policy if exists "Anyone can read info content" on public.info_content;
create policy "Anyone can read info content"
  on public.info_content for select
  to anon, authenticated
  using (true);

-- Only staff can create/update it (reuses the role helper from 0005).
drop policy if exists "Staff insert info content" on public.info_content;
create policy "Staff insert info content"
  on public.info_content for insert
  to authenticated
  with check (public.current_user_role() in ('employee', 'admin'));

drop policy if exists "Staff update info content" on public.info_content;
create policy "Staff update info content"
  on public.info_content for update
  to authenticated
  using (public.current_user_role() in ('employee', 'admin'))
  with check (public.current_user_role() in ('employee', 'admin'));

-- Realtime so display edits appear without a reload.
alter publication supabase_realtime add table public.info_content;
