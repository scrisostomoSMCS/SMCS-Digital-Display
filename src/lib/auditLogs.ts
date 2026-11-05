import { supabase } from "./supabase";

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
  actorId: string | null; // one person, or null for everyone
  source: "all" | AuditSource;
  category: string | null;
};

export const NO_AUDIT_FILTERS: AuditFilters = {
  actorId: null,
  source: "all",
  category: null,
};

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

export function matchesAuditFilters(log: AuditLog, f: AuditFilters): boolean {
  if (f.actorId && log.actorId !== f.actorId) return false;
  if (f.source !== "all" && log.source !== f.source) return false;
  if (f.category && log.category !== f.category) return false;
  return true;
}

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
    .select(
      "id, created_at, actor_id, actor_name, source, action, category, table_name, record_id, summary, old_data, new_data, changed_fields",
    )
    .order("id", { ascending: false })
    .limit(AUDIT_PAGE_SIZE);
  if (beforeId !== undefined) query = query.lt("id", beforeId);
  if (filters.actorId) query = query.eq("actor_id", filters.actorId);
  if (filters.source !== "all") query = query.eq("source", filters.source);
  if (filters.category) query = query.eq("category", filters.category);

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
  Entries since this admin last opened Logs, not counting their own. The RPC
  stops counting at 10, which is all the "9+" badge needs. null when the call
  failed: the badge then stays as it was rather than claiming zero.
*/
export async function fetchAuditUnreadCount(): Promise<number | null> {
  const { data, error } = await supabase.rpc("audit_logs_unread_count");
  if (error || typeof data !== "number") return null;
  return data;
}

// Clears this admin's badge (database clock) and runs the 180-day purge.
export async function markAuditLogsSeen(): Promise<void> {
  const { error } = await supabase.rpc("mark_audit_logs_seen");
  if (error) console.warn("Couldn't mark logs as seen:", error.message);
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
