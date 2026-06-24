# lib/

Shared, non-UI code lives here (data access, clients, helpers).

Integrations stay isolated behind this folder so pages/components stay
decoupled from the data layer:

- `supabase.ts` — public (anon) Supabase client for the read-only dashboard.
- `events.ts` — `DashboardEvent` type + `fetchDashboardEvents()` (reads the
  `events` table). The calendar subscribes to realtime changes in
  `components/dashboard/WeekCalendar.tsx`.

The DB schema lives in `supabase/migrations/`.
