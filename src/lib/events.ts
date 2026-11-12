import { supabase } from "./supabase";
import {
  expandEvents,
  recurrenceFromColumns,
  utcDateKey,
  type Recurrence,
} from "./recurrence";

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
  color?: string; // hex; the calendar tints the event block with this
  // Weekly series only (0035). A series row carries `recurrence`; screens call
  // expandEvents (src/lib/recurrence) to turn it into dated occurrences, which
  // also carry the series id and their date.
  recurrence?: Recurrence;
  seriesId?: string;
  occurrenceDate?: string; // "YYYY-MM-DD"
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
  color: string | null;
  recurrence_days: number[] | null;
  recurrence_until: string | null;
  recurrence_exceptions: string[] | null;
};

const EVENT_COLUMNS =
  "id, name, description, location, starts_at, ends_at, all_day, color, recurrence_days, recurrence_until, recurrence_exceptions";

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
    color: row.color ?? undefined,
    recurrence: recurrenceFromColumns(
      row.recurrence_days,
      row.recurrence_until,
      row.recurrence_exceptions,
    ),
  };
}

/*
  Load all events from Supabase. The calendar only renders the days in view, so
  returning everything is fine for a small schedule; add a date-range filter
  here later if the table grows large. Weekly series come back as one row each;
  WeekCalendar expands them for the week it shows. On error we log and return
  [] so the display degrades to "no events" rather than crashing.
*/
export async function fetchDashboardEvents(): Promise<DashboardEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    // show_on_dashboard now defaults to true (0036) and is no longer
    // staff-editable, so every event is public. The column and this filter
    // stay for RLS compatibility ("Dashboard events readable by anyone"
    // checks it) and so signed-in staff, whose RLS reads ALL events, see the
    // same Live Calendar as the public.
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
  convention (an event stored at 09:00Z on this date reads as 9 AM today). The
  show_on_dashboard filter is kept for the same reason as in
  fetchDashboardEvents: the flag defaults to true (0036) and is no longer
  staff-editable, but RLS still checks it, and signed-in staff (who can read
  every event) should see the same list as the public.

  Two kinds of row can land today: one-time events that start today, and weekly
  series (0035) that began on or before today and haven't ended. A series that
  started weeks ago would fail a plain starts_at filter, so the query ORs both
  and expandEvents picks out today's occurrence. An event counts when it STARTS
  today (an overnight occurrence from last night isn't listed), as before.
*/
export async function fetchTodaysEvents(): Promise<DashboardEvent[]> {
  const now = new Date();
  const startMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const endMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const start = new Date(startMs).toISOString();
  const end = new Date(endMs).toISOString();
  const today = utcDateKey(startMs);

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("show_on_dashboard", true)
    .or(
      `and(starts_at.gte."${start}",starts_at.lt."${end}"),` +
        `and(recurrence_days.not.is.null,starts_at.lt."${end}",` +
        `or(recurrence_until.is.null,recurrence_until.gte.${today}))`,
    )
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("Failed to load today's events:", error.message);
    return [];
  }
  return expandEvents((data ?? []).map(fromRow), new Date(startMs), new Date(endMs))
    .filter((e) => {
      const s = Date.parse(e.start);
      return s >= startMs && s < endMs;
    })
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
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
      `event:events(${EVENT_COLUMNS})` as const,
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
