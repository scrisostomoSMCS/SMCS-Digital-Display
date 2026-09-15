-- SMCS: a custom slide's background is now any color the employee picks, not
-- one of the three brand backgrounds. The column is unchanged (text, default
-- 'blue'); this migration only widens what the app writes into it and records
-- that here, so no data has to move. Run in Supabase SQL Editor.
--
-- New values are hex strings ('#0054a4'). Rows written before the color picker
-- still hold 'blue' | 'teal' | 'paper'; the app resolves those to the same
-- colors they always painted (see src/lib/slideBackgrounds.ts), and rewrites
-- them as hex the next time the slide is saved.

comment on column public.slides.background is
  'Slide background color. Hex string (e.g. #0054a4). Legacy rows may still hold blue | teal | paper.';
