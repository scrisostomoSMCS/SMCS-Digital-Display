-- SMCS: per-event color so overlapping events stay readable on the Live
-- Calendar. Employees pick a color when creating/editing an event; the calendars
-- render each event in its color. Stored as a hex string, defaulting to the
-- brand blue so every existing event keeps its current look.
alter table public.events
  add column if not exists color text not null default '#0054a4';
