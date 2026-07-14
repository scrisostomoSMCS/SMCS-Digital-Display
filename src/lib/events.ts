import { supabase } from "./supabase";

/*
  The shape every schedule event is rendered against. The calendar depends only
  on this type, so the data source can change without touching any UI.
*/
export type DashboardEvent = {
  id: string;
  name: string;
  description?: string;
  location?: string;
  start: string; // ISO 8601
  end?: string; // ISO 8601
  allDay?: boolean;
};

// Raw row shape from the `events` table (snake_case, nullable columns).
type EventRow = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean | null;
};

// Map a DB row onto the DashboardEvent contract the calendar renders.
function fromRow(row: EventRow): DashboardEvent {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    location: row.location ?? undefined,
    start: row.starts_at,
    end: row.ends_at ?? undefined,
    allDay: row.all_day ?? undefined,
  };
}

/*
  Load all events from Supabase. The calendar only renders the days in view, so
  returning everything is fine for a small schedule; add a date-range filter
  here later if the table grows large. On error we log and return [] so the
  display degrades to "no events" rather than crashing.
*/
export async function fetchDashboardEvents(): Promise<DashboardEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, name, description, location, starts_at, ends_at, all_day")
    // The Live Dashboard is admin-curated: an event shows here only when an
    // admin/employee has explicitly flagged it (show_on_dashboard). Client
    // signups never appear here, they only land on the personal calendar.
    // RLS also blocks the public from reading non-dashboard events.
    .eq("show_on_dashboard", true)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("Failed to load events from Supabase:", error.message);
    return [];
  }

  return (data ?? []).map(fromRow);
}

/*
  Load today's dashboard events for the /information display. "Today" is the
  local calendar date expressed as UTC bounds, matching the app's UTC wall-clock
  convention (an event stored at 09:00Z on this date reads as 9 AM today). Only
  events flagged for the dashboard are public, so that's what the display shows.
*/
export async function fetchTodaysEvents(): Promise<DashboardEvent[]> {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  ).toISOString();
  const end = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1),
  ).toISOString();

  const { data, error } = await supabase
    .from("events")
    .select("id, name, description, location, starts_at, ends_at, all_day")
    .eq("show_on_dashboard", true)
    .gte("starts_at", start)
    .lt("starts_at", end)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("Failed to load today's events:", error.message);
    return [];
  }
  return (data ?? []).map(fromRow);
}

/*
  Load the current user's OWN schedule: events they've been signed up for, read
  through the `signups` join table. RLS on `signups` (user_id = auth.uid())
  guarantees only the logged-in user's rows come back, so this can never expose
  another user's schedule. Role-agnostic, works for any authenticated user.
*/
export async function fetchMySchedule(): Promise<DashboardEvent[]> {
  const { data, error } = await supabase
    .from("signups")
    .select(
      "event:events(id, name, description, location, starts_at, ends_at, all_day)",
    );

  if (error) {
    console.error("Failed to load personal schedule:", error.message);
    return [];
  }

  // Each row embeds its related event. PostgREST/types may surface the relation
  // as a single object or a one-element array, so normalize both shapes.
  return (data ?? [])
    .flatMap((row) => {
      const e = row.event as unknown as EventRow | EventRow[] | null;
      if (!e) return [];
      return Array.isArray(e) ? e : [e];
    })
    .map(fromRow);
}
