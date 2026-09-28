import { supabase } from "./supabase";

/*
  Short-lived announcements for the Digital Bulletin. Staff push one message
  from the manage page; every wall screen overlays it for five minutes and then
  it disappears on its own. English only.

  The DATABASE owns the clock (see migration 0022). A row is live while
  now() < expires_at, evaluated in Postgres by the RLS policy on every read, so
  a staff laptop or a TV with a wrong clock can never widen an announcement's
  window. Nothing here sends a timestamp to the server, and nothing here filters
  by the local clock either — see fetchLiveAnnouncement.
*/

export const ANNOUNCEMENT_MAX_LENGTH = 200;
// The counter turns a warning color from here up, so the writer sees the wall
// coming before they hit it.
export const ANNOUNCEMENT_WARN_LENGTH = 180;
export const ANNOUNCEMENT_DURATION_MS = 5 * 60 * 1000;

// Both the manage modal and the wall display open the same modal/bubble from
// two different component trees, so the launcher listens for this instead of a
// context provider wrapped around the whole manage page.
export const OPEN_ANNOUNCEMENT_EVENT = "smcs:open-announcement";

export function openAnnouncementModal() {
  window.dispatchEvent(new Event(OPEN_ANNOUNCEMENT_EVENT));
}

export type Announcement = {
  id: string;
  message: string;
  createdAt: string;
  expiresAt: string;
};

type AnnouncementRow = {
  id: string;
  message: string;
  created_at: string;
  expires_at: string;
};

const COLUMNS = "id, message, created_at, expires_at";

function fromRow(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    message: row.message,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

/*
  The one live announcement, or null.

  Deliberately does NOT add a `.gt("expires_at", <local now>)` filter. The RLS
  policy already restricts this table to live rows using the database's clock,
  so a local filter could only ever do harm: a wall screen whose clock runs ten
  minutes fast would filter out a genuinely live announcement and show nothing.
  Letting the database decide fails in the safe direction.

  Errors are swallowed and reported as "nothing live", matching fetchSlides.
  The bulletin must render exactly as it does today when this query fails.
*/
export async function fetchLiveAnnouncement(): Promise<Announcement | null> {
  const { data, error } = await supabase
    .from("announcements")
    .select(COLUMNS)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("Announcements unavailable:", error.message);
    return null;
  }
  return data ? fromRow(data as AnnouncementRow) : null;
}

/*
  Milliseconds left on an announcement, for the countdown in the modal and the
  self-expiry timer on the display.

  Clamped at both ends because this is the ONE place the local clock is
  consulted, and a wall-mounted TV is exactly where a wrong clock shows up:
    floor 0                        - a clock running fast expires it early,
                                     which is the safe direction to fail.
    ceiling ANNOUNCEMENT_DURATION_MS - a clock running slow (an hour behind,
                                     say) would otherwise compute an hour of
                                     remaining time and pin a five-minute
                                     message to the wall. No announcement can
                                     ever have more than its full duration
                                     left, so capping there bounds the damage
                                     to one window even in the worst case.
*/
export function remainingMs(
  announcement: Announcement,
  now: number = Date.now(),
): number {
  const ms = new Date(announcement.expiresAt).getTime() - now;
  if (!Number.isFinite(ms)) return 0;
  return Math.min(Math.max(ms, 0), ANNOUNCEMENT_DURATION_MS);
}

// "4:37" for the modal's countdown. Rounds up so it reads 5:00 the instant an
// announcement lands rather than flashing 4:59.
export function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/*
  Push a new announcement. Goes through the RPC rather than an insert: the RPC
  sets expires_at from the database clock, retires any currently live row in the
  same transaction, and re-checks the 200-character limit server-side. There is
  no insert policy on the table, so this is the only way in.
*/
export async function pushAnnouncement(message: string): Promise<void> {
  const { error } = await supabase.rpc("push_announcement", {
    p_message: message,
  });
  if (error) throw new Error(error.message);
}

// Retire whatever is live right now ("End Now"). A no-op if nothing is.
export async function endAnnouncement(): Promise<void> {
  const { error } = await supabase.rpc("end_announcement");
  if (error) throw new Error(error.message);
}
