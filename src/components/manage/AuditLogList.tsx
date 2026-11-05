"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { relativeTime } from "@/lib/relativeTime";
import {
  AUDIT_CATEGORIES,
  AUDIT_PAGE_SIZE,
  NO_AUDIT_FILTERS,
  fetchAuditActors,
  fetchAuditLogs,
  markAuditLogsSeen,
  matchesAuditFilters,
  pacificTime,
  toAuditLog,
  type AuditFilters,
  type AuditLog,
} from "@/lib/auditLogs";
import { inputClass, labelClass } from "./editorFields";

/*
  The admin audit log: every change to the Digital Bulletin, newest first, 50
  at a time. Each row expands to show the changed fields before and after.

  Opening this screen marks everything as seen (clears the sidebar badge), and
  so does each entry that arrives live while it is open, since it is on screen.
*/

// How often the "5 min ago" labels re-render.
const TICK = 60_000;
const SEEN_DELAY = 1_000;

const loadMoreClass =
  "inline-block rounded-full border-2 border-blue px-5 py-2 text-base font-semibold text-blue hover:bg-blue hover:text-paper disabled:opacity-50";

// "image_path" -> "image path"; info_content keys are already page names.
const fieldLabel = (field: string) => field.replace(/_/g, " ");

function FieldValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-ink/40">—</span>;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <span className="break-words whitespace-pre-wrap">{String(value)}</span>;
  }
  // Lists, menus, whole bulletin pages: readable JSON in a bounded box.
  return (
    <pre className="max-h-64 overflow-auto bg-ink/5 p-2 text-sm whitespace-pre-wrap">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

// Which fields the before/after table shows: the changed ones for an edit,
// every column for an added or deleted record.
function detailFields(log: AuditLog): string[] {
  if (log.changedFields.length > 0) return log.changedFields;
  return Object.keys(log.newData ?? log.oldData ?? {});
}

function LogRow({
  log,
  now,
  expanded,
  onToggle,
}: {
  log: AuditLog;
  now: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const detailsId = `audit-log-${log.id}`;
  const fields = detailFields(log);
  const automated = log.source === "automated";
  return (
    <li className="border-b border-placeholder last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-ink/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue"
      >
        <CaretRightIcon
          size={18}
          aria-hidden="true"
          className={`mt-1 shrink-0 text-ink/60 transition-transform duration-150 motion-reduce:transition-none ${
            expanded ? "rotate-90" : ""
          }`}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold break-words">{log.summary}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-ink/70">
            {automated ? (
              // Bordered amber tag, never color alone: the word says it.
              <span className="flex items-center gap-2">
                <span className="rounded border-2 border-amber px-1.5 text-sm leading-snug font-bold tracking-wide text-amber uppercase">
                  Automated
                </span>
                <span>{log.actorName}</span>
              </span>
            ) : (
              <span className="font-semibold text-ink">{log.actorName}</span>
            )}
            <span aria-hidden="true" className="text-ink/40">·</span>
            <span>{log.category}</span>
            <span aria-hidden="true" className="text-ink/40">·</span>
            <span>
              {relativeTime(log.createdAt, now)}
              <span className="text-ink/60"> ({pacificTime(log.createdAt)})</span>
            </span>
          </span>
        </span>
      </button>

      {expanded && (
        <div id={detailsId} className="px-4 pb-4 pl-11">
          {fields.length === 0 ? (
            <p className="text-base text-ink/60">No field details for this change.</p>
          ) : (
            <div className="overflow-x-auto border-2 border-placeholder">
              <table className="w-full min-w-[560px] table-fixed text-left text-base">
                <thead className="border-b-2 border-placeholder bg-ink/5">
                  <tr>
                    <th scope="col" className="w-48 px-3 py-2 font-semibold">Field</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Before</th>
                    <th scope="col" className="px-3 py-2 font-semibold">After</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field) => (
                    <tr key={field} className="border-b border-placeholder align-top last:border-b-0">
                      <th scope="row" className="px-3 py-2 font-semibold break-words">
                        {fieldLabel(field)}
                      </th>
                      <td className="px-3 py-2">
                        <FieldValue value={log.oldData?.[field]} />
                      </td>
                      <td className="px-3 py-2">
                        <FieldValue value={log.newData?.[field]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function AuditLogList() {
  const [filters, setFilters] = useState<AuditFilters>(NO_AUDIT_FILTERS);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actors, setActors] = useState<{ id: string; name: string }[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  // The live subscription outlives filter changes; it reads the current ones.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // First page for the current filters. A response for filters that have
  // since changed is dropped, so a slow query can't overwrite a newer one.
  const loadFirstPage = useCallback(async (f: AuditFilters) => {
    const result = await fetchAuditLogs(f);
    if (filtersRef.current !== f) return;
    setLoaded(true);
    setError(result.error);
    setLogs(result.logs);
    setHasMore(result.logs.length === AUDIT_PAGE_SIZE);
    setExpanded(new Set());
  }, []);

  useEffect(() => {
    loadFirstPage(filters);
  }, [filters, loadFirstPage]);

  async function loadMore() {
    const last = logs[logs.length - 1];
    if (!last) return;
    setLoadingMore(true);
    const f = filters;
    const result = await fetchAuditLogs(f, last.id);
    setLoadingMore(false);
    if (filtersRef.current !== f) return;
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setLogs((prev) => [...prev, ...result.logs]);
    setHasMore(result.logs.length === AUDIT_PAGE_SIZE);
  }

  useEffect(() => {
    // Opening the screen is what "seen" means for the badge.
    markAuditLogsSeen();
    fetchAuditActors().then(setActors);

    let seenTimer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel("audit-logs-list")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_logs" },
        (payload) => {
          const log = toAuditLog(payload.new as Parameters<typeof toAuditLog>[0]);
          if (matchesAuditFilters(log, filtersRef.current)) {
            setLogs((prev) => (prev.some((l) => l.id === log.id) ? prev : [log, ...prev]));
          }
          if (log.actorId) {
            setActors((prev) =>
              prev.some((a) => a.id === log.actorId)
                ? prev
                : [...prev, { id: log.actorId as string, name: log.actorName }].sort((a, b) =>
                    a.name.localeCompare(b.name),
                  ),
            );
          }
          // It arrived while this screen is open, so it has been seen.
          if (seenTimer) clearTimeout(seenTimer);
          seenTimer = setTimeout(markAuditLogsSeen, SEEN_DELAY);
        },
      )
      .subscribe();

    const tick = setInterval(() => setNow(Date.now()), TICK);
    return () => {
      if (seenTimer) clearTimeout(seenTimer);
      supabase.removeChannel(channel);
      clearInterval(tick);
    };
  }, []);

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered =
    filters.actorId !== null || filters.source !== "all" || filters.category !== null;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="block w-full sm:w-64">
          <span className={labelClass}>Person</span>
          <select
            className={inputClass}
            value={filters.actorId ?? ""}
            onChange={(e) => setFilters({ ...filters, actorId: e.target.value || null })}
          >
            <option value="">Everyone</option>
            {actors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block w-full sm:w-56">
          <span className={labelClass}>Made by</span>
          <select
            className={inputClass}
            value={filters.source}
            onChange={(e) =>
              setFilters({ ...filters, source: e.target.value as AuditFilters["source"] })
            }
          >
            <option value="all">People and automated</option>
            <option value="user">People only</option>
            <option value="automated">Automated only</option>
          </select>
        </label>
        <label className="block w-full sm:w-56">
          <span className={labelClass}>Category</span>
          <select
            className={inputClass}
            value={filters.category ?? ""}
            onChange={(e) => setFilters({ ...filters, category: e.target.value || null })}
          >
            <option value="">All categories</option>
            {AUDIT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        {filtered && (
          <button
            type="button"
            onClick={() => setFilters(NO_AUDIT_FILTERS)}
            className="mb-2 text-base font-semibold text-blue underline hover:no-underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 border-l-4 border-red bg-red/5 px-3 py-2 text-base font-semibold text-red"
        >
          Couldn&rsquo;t load the logs ({error}).
        </p>
      )}

      {!loaded ? (
        <p className="mt-6 text-lg text-ink/60">Loading logs…</p>
      ) : logs.length === 0 ? (
        <p className="mt-6 text-lg text-ink/60">
          {filtered ? "No changes match these filters." : "No changes have been logged yet."}
        </p>
      ) : (
        <>
          <ul className="mt-5 border-2 border-placeholder">
            {logs.map((log) => (
              <LogRow
                key={log.id}
                log={log}
                now={now}
                expanded={expanded.has(log.id)}
                onToggle={() => toggle(log.id)}
              />
            ))}
          </ul>
          {hasMore && (
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className={loadMoreClass}
              >
                {loadingMore ? "Loading…" : `Load ${AUDIT_PAGE_SIZE} more`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
