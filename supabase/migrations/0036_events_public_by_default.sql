-- SMCS, every calendar event is public by default. Run in Supabase: SQL Editor
-- → New query → paste → Run. Safe to re-run.
--
-- Apply this migration to prod BEFORE deploying the code that removes the Show
-- on Live Calendar checkbox; otherwise new events default to false and are
-- hidden from public screens.
--
-- WHY
-- The "Show on Live Calendar" checkbox was a scheduling workaround: staff
-- ticked it by hand when an event's time came. Events are now scheduled
-- properly, so every event belongs on the public Live Calendar and the
-- "Events happening today" display. The website no longer sends
-- show_on_dashboard on create or update, so new events take this default.
--
-- WHAT IS KEPT
-- The column itself stays (not dropped): the RLS policy "Dashboard events
-- readable by anyone" (0004) checks show_on_dashboard = true, and the Expo app
-- reads and filters on it. The policy, the audit functions (0034/0035), and
-- existing rows are unchanged. Existing rows with show_on_dashboard = false
-- are NOT backfilled here; that is a separate, reviewed UPDATE.

alter table public.events
  alter column show_on_dashboard set default true;
