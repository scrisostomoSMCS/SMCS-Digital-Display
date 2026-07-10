-- SMCS — per-slide background choice (one of the brand backgrounds). Lets the
-- editor's preview match the live display exactly instead of depending on the
-- slide's position in the rotation. Run in Supabase SQL Editor.

alter table public.slides
  add column if not exists background text not null default 'blue';
-- allowed values: 'blue' | 'teal' | 'paper' (white)
