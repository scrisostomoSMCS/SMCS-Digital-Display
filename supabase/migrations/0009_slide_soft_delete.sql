-- SMCS, soft delete for custom slides, so an accidental delete can be
-- recovered instead of losing the slide's content/image forever.
-- Run in Supabase SQL Editor.

alter table public.slides
  add column if not exists hidden boolean not null default false;

create index if not exists slides_hidden_idx on public.slides (hidden);
