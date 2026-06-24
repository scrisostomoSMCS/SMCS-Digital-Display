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
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("Failed to load events from Supabase:", error.message);
    return [];
  }

  return (data ?? []).map(fromRow);
}
