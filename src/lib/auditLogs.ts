import { supabase } from "./supabase";
import { NOUN, actionPill } from "./auditActionPill";

/*
  The admin-only audit log behind /manage/logs (migration 0034). Rows are
  written ONLY by the database trigger on each bulletin table; the app never
  inserts here and cannot (no write grants). This module only reads, plus the
  two badge RPCs.

  RLS limits every read to admins, so for anyone else these return nothing.
*/

export type AuditSource = "user" | "automated";
export type AuditAction = "insert" | "update" | "delete";

export type AuditLog = {
  id: number;
  createdAt: string;
  actorId: string | null;
  actorName: string;
  source: AuditSource;
  action: AuditAction;
  category: string;
  tableName: string;
  recordId: string | null;
  summary: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  changedFields: string[];
};

// Must match the categories audit_describe writes in 0034.
export const AUDIT_CATEGORIES = [
  "Custom slides",
  "Bulletin pages",
  "Locations",
  "Bed counts",
  "Announcements",
  "Lost & found",
  "Calendar",
  "Screens",
  "Manage page",
] as const;

export const AUDIT_PAGE_SIZE = 50;

export type AuditFilters = {
  search: string; // matched against the summary, case-insensitive
  actorId: string | null; // one person, or null for everyone
  source: "all" | AuditSource;
  category: string | null;
  // Pacific calendar days, "YYYY-MM-DD", inclusive. One alone = that day.
  from: string | null;
  to: string | null;
};

export const NO_AUDIT_FILTERS: AuditFilters = {
  search: "",
  actorId: null,
  source: "all",
  category: null,
  from: null,
  to: null,
};

export const hasAuditFilters = (f: AuditFilters) =>
  f.search.trim() !== "" ||
  f.actorId !== null ||
  f.source !== "all" ||
  f.category !== null ||
  f.from !== null ||
  f.to !== null;

/* --- Pacific time ---------------------------------------------------------
  The log is read in the organization's time, whatever the viewer's laptop is
  set to: dates, times, and the date filter's day boundaries are all Pacific.
*/
const PACIFIC = "America/Los_Angeles";

const offsetFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC,
  timeZoneName: "longOffset", // "GMT-08:00"
});

// Minutes Pacific is ahead of UTC at instant `t` (-480 in winter, -420 in summer).
function pacificOffsetMinutes(t: number): number {
  const name = offsetFmt.formatToParts(t).find((p) => p.type === "timeZoneName")?.value ?? "";
  const m = name.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

// The UTC instant of Pacific midnight starting the day `ymd` (+ `addDays`).
// Corrected twice so a day that starts or ends on a DST change lands right.
function pacificMidnight(ymd: string, addDays = 0): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  const wall = Date.UTC(y, mo - 1, d + addDays);
  let t = wall;
  for (let i = 0; i < 2; i++) t = wall - pacificOffsetMinutes(t) * 60_000;
  return new Date(t).toISOString();
}

// An entry's Pacific calendar day, "YYYY-MM-DD" (en-CA formats it that way).
const ymdFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: PACIFIC,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export const pacificDay = (iso: string) => ymdFmt.format(Date.parse(iso));

// The filter's range with a single day filled in on both ends, or nulls.
export function dayRange(f: Pick<AuditFilters, "from" | "to">): [string, string] | null {
  const from = f.from ?? f.to;
  const to = f.to ?? f.from;
  if (!from || !to) return null;
  return from <= to ? [from, to] : [to, from];
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC,
  month: "short",
  day: "numeric",
  year: "numeric",
});
const clockFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC,
  hour: "numeric",
  minute: "2-digit",
});
// "Nov 4, 2026" and "3:59 PM".
export const pacificDate = (iso: string) => dateFmt.format(Date.parse(iso));
export const pacificClock = (iso: string) => clockFmt.format(Date.parse(iso));

type AuditDbRow = {
  id: number;
  created_at: string;
  actor_id: string | null;
  actor_name: string;
  source: AuditSource;
  action: AuditAction;
  category: string;
  table_name: string;
  record_id: string | null;
  summary: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
};

// Also used for Realtime payloads, which arrive as raw database rows.
export const toAuditLog = (r: AuditDbRow): AuditLog => ({
  id: r.id,
  createdAt: r.created_at,
  actorId: r.actor_id,
  actorName: r.actor_name,
  source: r.source,
  action: r.action,
  category: r.category,
  tableName: r.table_name,
  recordId: r.record_id,
  summary: r.summary,
  oldData: r.old_data,
  newData: r.new_data,
  changedFields: r.changed_fields ?? [],
});

// The same rules as fetchAuditLogs, for entries that arrive live.
export function matchesAuditFilters(log: AuditLog, f: AuditFilters): boolean {
  const q = f.search.trim().toLowerCase();
  if (q && !log.summary.toLowerCase().includes(q)) return false;
  if (f.actorId && log.actorId !== f.actorId) return false;
  if (f.source !== "all" && log.source !== f.source) return false;
  if (f.category && log.category !== f.category) return false;
  const range = dayRange(f);
  if (range) {
    const day = pacificDay(log.createdAt);
    if (day < range[0] || day > range[1]) return false;
  }
  return true;
}

const AUDIT_COLUMNS =
  "id, created_at, actor_id, actor_name, source, action, category, table_name, record_id, summary, old_data, new_data, changed_fields";

/* --- Grouping --------------------------------------------------------------
  The trigger writes one entry per row, so a save that touches several rows
  (six bed counts, several slides) leaves several entries. The Logs table and
  the badge show them as ONE group. This happens only at display time: the
  table itself is untouched, so older entries group too.

  Entries next to each other (newest first) join a group when they share the
  person, source, category and action pill, and each is within
  AUDIT_GROUP_WINDOW_MS of the one before it. Anything else, including another
  person's entry in between, starts a new group.
*/
export const AUDIT_GROUP_WINDOW_MS = 10_000;

export type AuditLogGroup = {
  // The oldest entry's id: unchanged as live entries join at the top.
  key: number;
  logs: AuditLog[]; // newest first, never empty
};

const groupKeyOf = (l: AuditLog) =>
  [l.source, l.actorId ?? l.actorName, l.category, actionPill(l).label].join("\u0000");

export function groupAuditLogs(logs: AuditLog[]): AuditLogGroup[] {
  const groups: AuditLog[][] = [];
  let lastKey = "";
  for (const log of logs) {
    const key = groupKeyOf(log);
    const current = groups[groups.length - 1];
    const prev = current?.[current.length - 1];
    if (
      prev &&
      key === lastKey &&
      Math.abs(Date.parse(prev.createdAt) - Date.parse(log.createdAt)) <= AUDIT_GROUP_WINDOW_MS
    ) {
      current.push(log);
    } else {
      groups.push([log]);
      lastKey = key;
    }
  }
  return groups.map((g) => ({ key: g[g.length - 1].id, logs: g }));
}

// "Bed count updated: " when every entry's summary starts with it, else null.
function sharedPrefix(logs: AuditLog[]): string | null {
  const first = logs[0].summary;
  const cut = first.indexOf(": ");
  if (cut <= 0) return null;
  const prefix = first.slice(0, cut + 2);
  return logs.every((l) => l.summary.startsWith(prefix)) ? prefix : null;
}

// One change inside an open group, without the part the group's line says:
// "Bed count updated: Men's Lodge 1 → 2" -> "Men's Lodge 1 → 2".
export function groupChildSummary(group: AuditLogGroup, log: AuditLog): string {
  const prefix = sharedPrefix(group.logs);
  return prefix ? log.summary.slice(prefix.length) : log.summary;
}

// What the "(N ...)" counts, by table. Anything else counts "changes".
const GROUP_UNIT: Record<string, string> = {
  bed_availability: "locations",
  slides: "slides",
  slide_locations: "locations",
  builtin_page_locations: "locations",
  bulletin_locations: "locations",
  info_content: "pages",
  events: "events",
  screens: "screens",
  announcements: "announcements",
  lost_found_items: "items",
};

/*
  The Description of a group of two or more: "Bed counts updated (6
  locations)", "3 slides hidden". With `matchingOnly` (a search is on, so the
  query returned only the entries that match) it counts matching changes.
*/
export function groupSummary(group: AuditLogGroup, matchingOnly: boolean): string {
  const { logs } = group;
  const lead = logs[0];
  const n = logs.length;
  const noun = NOUN[lead.tableName] ?? "Record";
  const prefix = sharedPrefix(logs);
  const base = prefix ? prefix.slice(0, -2) : actionPill(lead).label;
  const label = base.startsWith(`${noun} `) ? `${noun}s${base.slice(noun.length)}` : base;
  if (matchingOnly) return `${label} (${n} matching changes)`;

  // Count records only when each entry is a different record of one table;
  // the same slide edited twice is "2 changes", not "2 slides".
  const oneTable = logs.every((l) => l.tableName === lead.tableName);
  const distinct = new Set(logs.map((l) => l.recordId)).size === n;
  const unit = (oneTable && distinct && GROUP_UNIT[lead.tableName]) || "changes";
  // "Slides hidden" + slides -> "3 slides hidden", not "Slides hidden (3 slides)".
  if (unit !== "changes" && label.toLowerCase().startsWith(`${unit} `)) {
    return `${n} ${label[0].toLowerCase()}${label.slice(1)}`;
  }
  return `${label} (${n} ${unit})`;
}

// LIKE treats % and _ as wildcards; a search for "50%" means the characters.
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/*
  One page, newest first. `beforeId` is the last id already shown: paging by id
  rather than offset means entries arriving live never shift the next page and
  show up twice.
*/
export async function fetchAuditLogs(
  filters: AuditFilters,
  beforeId?: number,
): Promise<{ logs: AuditLog[]; error: string | null }> {
  let query = supabase
    .from("audit_logs")
    .select(AUDIT_COLUMNS)
    .order("id", { ascending: false })
    .limit(AUDIT_PAGE_SIZE);
  if (beforeId !== undefined) query = query.lt("id", beforeId);
  if (filters.actorId) query = query.eq("actor_id", filters.actorId);
  if (filters.source !== "all") query = query.eq("source", filters.source);
  if (filters.category) query = query.eq("category", filters.category);
  const q = filters.search.trim();
  if (q) query = query.ilike("summary", `%${escapeLike(q)}%`);
  const range = dayRange(filters);
  if (range) {
    query = query
      .gte("created_at", pacificMidnight(range[0]))
      .lt("created_at", pacificMidnight(range[1], 1));
  }

  const { data, error } = await query;
  if (error) return { logs: [], error: error.message };
  return { logs: (data as AuditDbRow[]).map(toAuditLog), error: null };
}

// People who appear in the log, for the "by user" filter.
export async function fetchAuditActors(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase.rpc("audit_log_actors");
  if (error || !data) return [];
  return (data as { actor_id: string; actor_name: string }[])
    .map((r) => ({ id: r.actor_id, name: r.actor_name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/*
  Each person's CURRENT role (not a snapshot), for the role pill. Admins can
  read every profile already (policy "Admins read all profiles", migration
  0012), so no RPC is needed. A deleted user has no profile and is left out.
*/
export async function fetchActorRoles(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase.from("profiles").select("id, role").in("id", ids);
  if (error || !data) return {};
  return Object.fromEntries(
    (data as { id: string; role: string }[]).map((p) => [p.id, p.role]),
  );
}

/*
  GROUPS of entries since this admin last opened Logs, not counting their own
  entries, grouped exactly as the Logs table groups them. Stops at 10, which is
  all the "9+" badge needs. null when a call failed: the badge then stays as it
  was rather than claiming zero.

  Counted here rather than by the audit_logs_unread_count() RPC (0034, which
  counts raw entries and is no longer called) because grouping uses the action
  pill, which only exists in the browser. Same rules as the RPC: "since" is
  profiles.logs_last_seen_at (database clock), and only admins can read
  audit_logs at all (RLS). Reads at most UNREAD_SCAN_LIMIT entries, far more
  than ten groups need.
*/
const UNREAD_CAP = 10;
const UNREAD_SCAN_LIMIT = 200;

export async function fetchAuditUnreadCount(): Promise<number | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user.id;
  if (!uid) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("logs_last_seen_at")
    .eq("id", uid)
    .maybeSingle();
  if (profileError) return null;
  const seen = (profile as { logs_last_seen_at: string | null } | null)?.logs_last_seen_at;

  let query = supabase
    .from("audit_logs")
    .select(AUDIT_COLUMNS)
    .or(`actor_id.is.null,actor_id.neq.${uid}`)
    .order("id", { ascending: false })
    .limit(UNREAD_SCAN_LIMIT);
  if (seen) query = query.gt("created_at", seen);

  const { data, error } = await query;
  if (error || !data) return null;
  const groups = groupAuditLogs((data as AuditDbRow[]).map(toAuditLog));
  return Math.min(groups.length, UNREAD_CAP);
}

// Fired on window once the logs are marked seen, so the sidebar badge (which
// stays mounted beside the Logs screen) recounts instead of keeping its old
// number for when you leave.
export const AUDIT_LOGS_SEEN_EVENT = "smcs:audit-logs-seen";

// Clears this admin's badge (database clock) and runs the 180-day purge.
export async function markAuditLogsSeen(): Promise<void> {
  const { error } = await supabase.rpc("mark_audit_logs_seen");
  if (error) {
    console.warn("Couldn't mark logs as seen:", error.message);
    return;
  }
  window.dispatchEvent(new Event(AUDIT_LOGS_SEEN_EVENT));
}

export const badgeLabel = (count: number) => (count > 9 ? "9+" : String(count));

// Exact time for the log, always in Pacific: the organization's time, whatever
// the viewer's laptop is set to. e.g. "Wed, Nov 4, 2026, 3:12 PM PST".
const pacificFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

export function pacificTime(iso: string): string {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? "" : pacificFmt.format(t);
}
