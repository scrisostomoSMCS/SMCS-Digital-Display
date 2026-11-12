import { supabase } from "./supabase";
import type { DashboardEvent } from "./events";
import { recurrenceFromColumns } from "./recurrence";

/*
  Editor (employee/admin) data layer: read ALL events and create/update/delete
  them. Writes hit the single Supabase `events` table, the same source the
  view-only Live Calendar reads, so changes propagate via realtime. RLS
  ("Staff …" policies) enforces that only employee/admin can actually write.

  Times follow the app-wide convention: stored as UTC wall-clock (an event at
  10:00 reads as 10:00 everywhere). The editor's FullCalendar uses timeZone="UTC"
  so the slot the employee picks maps straight to the stored value.
*/

export type ManageEvent = DashboardEvent;

// Form payload from the editor (ISO times already in UTC).
export type EventFormData = {
  name: string;
  description?: string;
  location?: string;
  start: string;
  end?: string;
  color: string; // hex; how the event renders on the calendars
  // Weekly repeat (0035); null = one-time. Skipped dates are NOT part of the
  // form, they change only through setSkippedDates.
  recurrence: { days: number[]; until: string | null } | null;
};

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

function fromRow(r: EventRow): ManageEvent {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    location: r.location ?? undefined,
    start: r.starts_at,
    end: r.ends_at ?? undefined,
    allDay: r.all_day ?? undefined,
    color: r.color ?? undefined,
    recurrence: recurrenceFromColumns(
      r.recurrence_days,
      r.recurrence_until,
      r.recurrence_exceptions,
    ),
  };
}

const COLUMNS =
  "id, name, description, location, starts_at, ends_at, all_day, color, recurrence_days, recurrence_until, recurrence_exceptions";

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

// Map the form payload onto the table's column names. show_on_dashboard is
// never sent: new events take its database default (true, 0036) and edits
// leave it alone. Saving a series leaves
// its skipped dates alone; turning repeat off clears them (the database only
// allows skipped dates on a series).
function toRow(d: EventFormData) {
  return {
    recurrence_days: d.recurrence?.days ?? null,
    recurrence_until: d.recurrence?.until ?? null,
    ...(d.recurrence ? {} : { recurrence_exceptions: null }),
    name: d.name,
    description: d.description || null,
    location: d.location || null,
    starts_at: d.start,
    ends_at: d.end || null,
    color: d.color,
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

/*
  Skip or un-skip single dates of a weekly series. Reads the current list first
  so a skip made by someone else a moment ago isn't overwritten, and writes ONLY
  recurrence_exceptions so the Logs screen records it as "Skipped Tue Nov 25 for
  …" / "Undid skip of …" rather than a general edit.
*/
export async function setSkippedDates(
  id: string,
  change: { add?: string; remove?: string },
): Promise<string | null> {
  const { data, error: readError } = await supabase
    .from("events")
    .select("recurrence_exceptions")
    .eq("id", id)
    .single();
  if (readError) {
    console.error("Load skipped dates failed:", readError.message);
    return readError.message;
  }
  const current = new Set<string>(
    (data?.recurrence_exceptions as string[] | null) ?? [],
  );
  if (change.add) current.add(change.add);
  if (change.remove) current.delete(change.remove);
  const next = [...current].sort();

  const { error } = await supabase
    .from("events")
    .update({ recurrence_exceptions: next.length ? next : null })
    .eq("id", id);
  if (error) {
    console.error("Update skipped dates failed:", error.message);
    return error.message;
  }
  return null;
}
