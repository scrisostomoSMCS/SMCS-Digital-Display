import { supabase } from "./supabase";
import type { DashboardEvent } from "./events";

/*
  Editor (employee/admin) data layer: read ALL events and create/update/delete
  them. Writes hit the single Supabase `events` table, the same source the
  view-only Live Dashboard reads, so changes propagate via realtime. RLS
  ("Staff …" policies) enforces that only employee/admin can actually write.

  Times follow the app-wide convention: stored as UTC wall-clock (an event at
  10:00 reads as 10:00 everywhere). The editor's FullCalendar uses timeZone="UTC"
  so the slot the employee picks maps straight to the stored value.
*/

export type ManageEvent = DashboardEvent & { showOnDashboard: boolean };

// Form payload from the editor (ISO times already in UTC).
export type EventFormData = {
  name: string;
  description?: string;
  location?: string;
  start: string;
  end?: string;
  showOnDashboard: boolean;
};

type EventRow = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean | null;
  show_on_dashboard: boolean;
};

function fromRow(r: EventRow): ManageEvent {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    location: r.location ?? undefined,
    start: r.starts_at,
    end: r.ends_at ?? undefined,
    allDay: r.all_day ?? undefined,
    showOnDashboard: r.show_on_dashboard,
  };
}

const COLUMNS =
  "id, name, description, location, starts_at, ends_at, all_day, show_on_dashboard";

export async function fetchAllEvents(): Promise<ManageEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select(COLUMNS)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("Failed to load events for editor:", error.message);
    return [];
  }
  return (data ?? []).map((r) => fromRow(r as EventRow));
}

// Map the form payload onto the table's column names.
function toRow(d: EventFormData) {
  return {
    name: d.name,
    description: d.description || null,
    location: d.location || null,
    starts_at: d.start,
    ends_at: d.end || null,
    show_on_dashboard: d.showOnDashboard,
  };
}

export async function createEvent(d: EventFormData): Promise<string | null> {
  const { error } = await supabase.from("events").insert(toRow(d));
  if (error) {
    console.error("Create event failed:", error.message);
    return error.message;
  }
  return null;
}

export async function updateEvent(
  id: string,
  d: EventFormData,
): Promise<string | null> {
  const { error } = await supabase.from("events").update(toRow(d)).eq("id", id);
  if (error) {
    console.error("Update event failed:", error.message);
    return error.message;
  }
  return null;
}

// Drag/resize only changes the times, a lighter write than the full form.
export async function moveEvent(
  id: string,
  start: string,
  end: string | null,
): Promise<string | null> {
  const { error } = await supabase
    .from("events")
    .update({ starts_at: start, ends_at: end })
    .eq("id", id);
  if (error) {
    console.error("Move event failed:", error.message);
    return error.message;
  }
  return null;
}

export async function deleteEvent(id: string): Promise<string | null> {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) {
    console.error("Delete event failed:", error.message);
    return error.message;
  }
  return null;
}
