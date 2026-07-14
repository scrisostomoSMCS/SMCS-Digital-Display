-- SMCS, custom slides for the /information rotating display.
-- Employees can add their own slides (title + message + list of items) on top
-- of the built-in pages. Stored here so they persist and drive the display.
-- Public reads; only staff can create/edit/delete. Run in Supabase SQL Editor.

create table if not exists public.slides (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text,
  items      jsonb not null default '[]'::jsonb, -- list of plain strings
  position   int not null default 0,             -- rotation/sidebar order
  created_at timestamptz not null default now()
);

create index if not exists slides_position_idx on public.slides (position);

alter table public.slides enable row level security;

-- The public display can read slides.
drop policy if exists "Anyone can read slides" on public.slides;
create policy "Anyone can read slides"
  on public.slides for select
  to anon, authenticated
  using (true);

-- Only staff can create/edit/delete (reuses the role helper from 0005).
drop policy if exists "Staff insert slides" on public.slides;
create policy "Staff insert slides"
  on public.slides for insert
  to authenticated
  with check (public.current_user_role() in ('employee', 'admin'));

drop policy if exists "Staff update slides" on public.slides;
create policy "Staff update slides"
  on public.slides for update
  to authenticated
  using (public.current_user_role() in ('employee', 'admin'))
  with check (public.current_user_role() in ('employee', 'admin'));

drop policy if exists "Staff delete slides" on public.slides;
create policy "Staff delete slides"
  on public.slides for delete
  to authenticated
  using (public.current_user_role() in ('employee', 'admin'));

alter publication supabase_realtime add table public.slides;
