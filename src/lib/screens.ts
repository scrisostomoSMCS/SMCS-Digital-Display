import { supabase } from "./supabase";

/*
  Screen health monitoring. Each wall TV loads /information?screen=<id> and
  checks in through the screen_heartbeat RPC (migration 0026); staff see the
  results on /manage/health and register screens there.

  The DATABASE owns the clock: last_seen and last_content_sync are stamped with
  Postgres now() inside the RPC, and status is derived at read time
  (screenStatus below), never stored. A TV sends no timestamps at all, only
  whether its content read just succeeded.
*/

// The TV checks in this often; the status thresholds below allow one missed
// beat before a screen reads as Delayed.
export const HEARTBEAT_INTERVAL = 5 * 60 * 1000;

const MINUTE = 60_000;
const DELAYED_AFTER = 10 * MINUTE;
const OFFLINE_AFTER = 20 * MINUTE;

export type ScreenStatus = "online" | "delayed" | "offline" | "never";

export type Screen = {
  id: string;
  name: string;
  locationId: string | null;
  locationName: string | null;
  lastSeen: string | null;
  lastContentSync: string | null;
  createdAt: string;
};

type ScreenRow = {
  id: string;
  name: string;
  location_id: string | null;
  last_seen: string | null;
  last_content_sync: string | null;
  created_at: string;
  location: { name: string } | null;
};

const COLUMNS =
  "id, name, location_id, last_seen, last_content_sync, created_at, location:bulletin_locations(name)";

function fromRow(row: ScreenRow): Screen {
  return {
    id: row.id,
    name: row.name,
    locationId: row.location_id,
    locationName: row.location?.name ?? null,
    lastSeen: row.last_seen,
    lastContentSync: row.last_content_sync,
    createdAt: row.created_at,
  };
}

/*
  Online < 10 min, Delayed 10–20 min, Offline > 20 min, Never seen when the
  screen is registered but has not checked in. A last_seen slightly in the
  future (the viewer's clock behind the server's) counts as online.
*/
export function screenStatus(
  lastSeen: string | null,
  now: number = Date.now(),
): ScreenStatus {
  if (!lastSeen) return "never";
  const then = new Date(lastSeen).getTime();
  if (Number.isNaN(then)) return "never";
  const elapsed = now - then;
  if (elapsed < DELAYED_AFTER) return "online";
  if (elapsed <= OFFLINE_AFTER) return "delayed";
  return "offline";
}

// Staff-only (RLS). Errors are returned rather than swallowed so the health
// page can say "couldn't load" instead of showing an empty, healthy-looking list.
export async function fetchScreens(): Promise<{
  screens: Screen[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("screens")
    .select(COLUMNS)
    .order("name", { ascending: true });
  if (error) return { screens: [], error: error.message };
  return {
    screens: ((data ?? []) as unknown as ScreenRow[]).map(fromRow),
    error: null,
  };
}

// Same rule as the database check: lowercase letters/numbers, single hyphens.
export const SCREEN_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function createScreen(input: {
  id: string;
  name: string;
  locationId: string | null;
}): Promise<string | null> {
  const id = input.id.trim().toLowerCase();
  const name = input.name.trim();
  if (!SCREEN_ID_PATTERN.test(id) || id.length > 64) {
    return "Screen ID can use lowercase letters, numbers, and single hyphens (e.g. lobby-1).";
  }
  if (!name) return "Enter a screen name.";

  const { error } = await supabase
    .from("screens")
    .insert({ id, name, location_id: input.locationId });
  if (!error) return null;
  if (error.code === "23505") return "A screen with that ID already exists.";
  return error.message;
}

/*
  Writes ask for the touched ids back: a write RLS filtered out "succeeds" with
  no error while changing nothing (same reasoning as slides.ts).
*/
const NO_ROWS =
  "You don't have permission to change this screen, or it no longer exists.";

export async function updateScreen(
  id: string,
  input: { name: string; locationId: string | null },
): Promise<string | null> {
  const name = input.name.trim();
  if (!name) return "Enter a screen name.";
  const { data, error } = await supabase
    .from("screens")
    .update({ name, location_id: input.locationId })
    .eq("id", id)
    .select("id");
  if (error) return error.message;
  return data && data.length > 0 ? null : NO_ROWS;
}

export async function deleteScreen(id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("screens")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) return error.message;
  return data && data.length > 0 ? null : NO_ROWS;
}

/*
  --- Wall display side ---

  Both functions below run on unattended TVs, so neither ever throws: a failed
  check-in must never affect what the bulletin shows.
*/

/*
  A tiny read of the same row the bulletin's content comes from. The display's
  own loaders fall back to built-in content on error, so they can't tell a real
  load from a failed one; this probe can.
*/
export async function probeContent(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("info_content")
      .select("id")
      .eq("id", 1)
      .maybeSingle();
    return !error;
  } catch {
    return false;
  }
}

// An unknown screen id is a silent no-op in the RPC, so this cannot create rows.
export async function sendHeartbeat(
  screenId: string,
  contentOk: boolean,
): Promise<void> {
  try {
    await supabase.rpc("screen_heartbeat", {
      p_screen_id: screenId,
      p_content_ok: contentOk,
    });
  } catch {
    /* silent by design */
  }
}
