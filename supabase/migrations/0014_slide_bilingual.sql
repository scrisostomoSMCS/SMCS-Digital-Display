-- SMCS: bilingual custom slides. Spanish counterparts of each text field so the
-- Digital Bulletin (an unattended wall display, no language chooser) can show
-- English and Spanish together on every slide. Existing slides get empty Spanish
-- fields (the display simply shows English until a Spanish version is added).
alter table public.slides
  add column if not exists title_es text not null default '',
  add column if not exists body_es text not null default '',
  add column if not exists items_es jsonb not null default '[]'::jsonb,
  add column if not exists caption_es text not null default '';
