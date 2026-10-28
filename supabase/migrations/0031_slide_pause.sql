-- SMCS, "Hide slide": staff can take a custom slide off every Digital Bulletin
-- screen for a while without deleting it. Paused slides stay in the manage list
-- (still editable, still previewable) and come back the moment they are
-- unpaused.
--
-- Not the same thing as `hidden` (0009). `hidden` is the soft delete behind
-- "Recently deleted"; `is_paused` is a slide that is still live on the manage
-- page and only kept off the screens. A slide can be both.
--
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. DEV PROJECT FIRST,
-- then production BEFORE deploying the code that reads this column (the app
-- selects and filters on `is_paused`, and without it every custom slide fails
-- to load). Safe to re-run.

-- 1) The column. Every existing slide reads as not paused, so nothing changes
-- on any screen until staff pause something.
alter table public.slides
  add column if not exists is_paused boolean not null default false;

comment on column public.slides.is_paused is
  'Staff "Hide slide" toggle: true keeps the slide off every bulletin screen. Not the soft delete (see hidden).';

-- Not added to the 0023/0025/0027 updated_at trigger on purpose: pausing a
-- slide is not an edit to its content, the same as `hidden` and `position`.

-- 2) Reads. The wall screens read as `anon`, so the database itself never
-- hands them a paused slide, whatever the client asks for. Staff still read
-- every row, because the manage page lists paused slides. Replaces the
-- `using (true)` policy from 0007; current_user_role() is null for anon.
drop policy if exists "Anyone can read slides" on public.slides;
create policy "Anyone can read slides"
  on public.slides for select
  to anon, authenticated
  using (
    not is_paused
    or public.current_user_role() in ('employee', 'admin')
  );

-- 3) Realtime nudge. Realtime checks each subscriber's read policy against the
-- NEW row, so once a slide is paused the anon screens are no longer sent its
-- update and would only drop it on the 10-minute backup poll. Instead, every
-- pause/unpause touches the display_settings singleton, which the screens can
-- always read and already listen to; the display reloads its slides on that
-- event. (display_settings.updated_at is not shown anywhere, so the bump is
-- harmless.) Runs as the staff member who made the change, who can already
-- write display_settings (0008).
create or replace function public.nudge_display_on_slide_pause()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.display_settings (id) values (1)
  on conflict (id) do update set updated_at = now();
  return null;
end;
$$;

drop trigger if exists slides_pause_nudges_display on public.slides;
create trigger slides_pause_nudges_display
  after update of is_paused on public.slides
  for each row
  when (old.is_paused is distinct from new.is_paused)
  execute function public.nudge_display_on_slide_pause();
