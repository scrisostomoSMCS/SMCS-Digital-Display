# lib/

Shared, non-UI code lives here (data access, clients, helpers). Integrations
stay isolated behind this folder so pages and components stay decoupled from
the data layer.

## Supabase clients

- `supabase.ts`, browser client (`@supabase/ssr`). Used by every client
  component for queries and Realtime. The session lives in cookies, so the
  server sees the same auth state. Public anon key only; access is enforced by
  Row Level Security.
- `supabase-server.ts`, `createSupabaseServerClient()` for Server Components
  and route handlers. Used for server-side auth and role checks.

## Schedule and events

- `events.ts`, the `DashboardEvent` type (the UI contract every calendar
  renders against) plus reads of the `events` table.
- `manageEvents.ts`, staff create/update/delete for events.
- `useLiveEvents.ts`, hook that loads events and subscribes to Realtime.
- `eventColors.ts`, the per-event color choices.
- Calendars consume all of this through `components/calendar/WeekCalendar.tsx`,
  which stays presentational; thin wrappers select public or personal data.

## Digital Bulletin

- `bulletinCanvas.ts`, the fixed 1920x1080 canvas: `CANVAS_WIDTH`,
  `CANVAS_HEIGHT`, `canvasStyle`, and `fitScale()`. Read this before touching
  any slide layout.
- `infoContent.ts`, the editable content for the built-in bulletin pages,
  stored as one JSON row in `info_content`, with the service icon map.
- `informationContent.ts`, the default/fallback copy used until a saved row
  exists, plus `PAGE_DURATION` (how long each page is shown).
- `slides.ts`, custom-slide types, CRUD, ordering, soft delete, and image
  upload to the `slide-images` Storage bucket.
- `weeklyMenu.ts`, the "Weekly menu" slide's `menu` jsonb shape, fixed
  bilingual day/meal labels, safe parsing, and Monday-to-Sunday week math.
- `displaySettings.ts`, which built-in pages are hidden from the rotation.
- `bulletinLocations.ts`, display locations and per-page/per-slide targeting.
- `bedAvailability.ts`, live bed counts in `bed_availability`: read, group into
  programs, save (staff), plus the reserve and Family Lodge phone numbers.
- `useBedAvailability.ts`, hook keeping bed counts live via Realtime, with one
  subscription shared by the bulletin panel, the manage previews, and the
  home-page popup so they all fail the same way.

## Users and site config

- `adminUsers.ts`, admin-only RPC wrappers for listing users and setting roles.
- `staffSignup.ts`, `STAFF_EMAIL_DOMAIN` and the staff email check. The same
  rule is enforced by a database trigger.
- `dashboardConfig.ts`, Live Calendar display settings (day range, hours, and
  the scrolling info bar items).
- `siteConfig.ts`, site-wide contact details shown in the header.
- `siteNavigation.ts`, the shared navigation links.

The DB schema lives in `supabase/migrations/`, which is the source of truth for
tables, RLS, Realtime publications, RPCs, and Storage buckets.
