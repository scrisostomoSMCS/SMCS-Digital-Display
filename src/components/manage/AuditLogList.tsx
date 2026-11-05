"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarBlankIcon,
  CaretRightIcon,
  MagnifyingGlassIcon,
  RobotIcon,
} from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import {
  AUDIT_CATEGORIES,
  AUDIT_PAGE_SIZE,
  NO_AUDIT_FILTERS,
  dayRange,
  fetchActorRoles,
  fetchAuditActors,
  fetchAuditLogs,
  hasAuditFilters,
  markAuditLogsSeen,
  matchesAuditFilters,
  pacificClock,
  pacificDate,
  pacificTime,
  toAuditLog,
  type AuditFilters,
  type AuditLog,
} from "@/lib/auditLogs";
import { PILL_TONE_CLASS, actionPill } from "@/lib/auditActionPill";

/*
  The admin audit log as a table: User, Date, Time, Action, Description, newest
  first, 50 at a time. Clicking a row opens the changed fields before and after.
  Light theme to match the manage page's content area (the sidebar stays dark).

  Opening this screen marks everything as seen (clears the sidebar badge), and
  so does each entry that arrives live while it is open, since it is on screen.
*/

const SEEN_DELAY = 1_000;
const SEARCH_DELAY = 300;

// The filter bar's controls: one height, the manage page's 2px borders.
const controlClass =
  "h-11 border-2 border-ink/30 bg-paper px-3 text-base focus:border-blue focus:outline-none";

const loadMoreClass =
  "inline-block rounded-full border-2 border-blue px-5 py-2 text-base font-semibold text-blue hover:bg-blue hover:text-paper disabled:opacity-50";

// "image_path" -> "image path"; info_content keys are already page names.
const fieldLabel = (field: string) => field.replace(/_/g, " ");

// "Maria Lopez" -> "ML"; "naustin@smcares.org" -> "NA".
function initials(name: string): string {
  const base = name.includes("@") ? name.split("@")[0] : name;
  const words = base.split(/[\s._-]+/).filter(Boolean);
  const letters =
    words.length >= 2 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

// Quoted record names in a summary are shown bold, without their quotes.
function Summary({ text }: { text: string }) {
  const parts = text.split(/"([^"]+)"/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-bold">
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

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

function Details({ log }: { log: AuditLog }) {
  const fields = detailFields(log);
  if (fields.length === 0) {
    return <p className="text-base text-ink/60">No field details for this change.</p>;
  }
  return (
    <div className="overflow-x-auto border-2 border-placeholder bg-paper">
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
  );
}

/*
  Who made the change. People: initials, name, and their CURRENT role as a
  small blue pill. Automated entries: a robot, the actor label, and an outlined
  amber "Automated" pill, so the two can't be mistaken for each other.
*/
function UserCell({ log, role }: { log: AuditLog; role: string | undefined }) {
  const automated = log.source === "automated";
  return (
    <div className="flex items-center gap-3">
      {automated ? (
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber/10 text-amber"
        >
          <RobotIcon size={20} weight="bold" />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue/10 text-sm font-bold text-blue"
        >
          {initials(log.actorName)}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-semibold" title={log.actorName}>
          {log.actorName}
        </span>
        {automated ? (
          <span className="mt-0.5 inline-block rounded border-2 border-amber px-1.5 text-xs leading-snug font-bold text-amber">
            Automated
          </span>
        ) : (
          role && (
            <span className="mt-0.5 inline-block rounded bg-blue px-1.5 py-px text-xs leading-snug font-bold text-paper">
              {role}
            </span>
          )
        )}
      </span>
    </div>
  );
}

/*
  The date filter: a calendar button that opens two native date pickers. Fill
  only "From" for a single day, or both for a range. Days are Pacific.
*/
function DateFilter({
  from,
  to,
  onChange,
}: {
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const range = dayRange({ from, to });
  const short = (ymd: string) => pacificDate(`${ymd}T12:00:00-08:00`).replace(/, \d{4}$/, "");
  const label = !range
    ? "Any date"
    : range[0] === range[1]
      ? short(range[0])
      : `${short(range[0])} – ${short(range[1])}`;

  return (
    <div ref={boxRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Date: ${label}`}
        className={`${controlClass} flex items-center gap-2 ${range ? "border-blue text-blue" : ""}`}
      >
        <CalendarBlankIcon size={20} aria-hidden="true" />
        <span className="whitespace-nowrap">{label}</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Filter by date"
          className="absolute top-full left-0 z-20 mt-2 w-72 border-2 border-ink/30 bg-paper p-4 shadow-lg"
        >
          <label className="block">
            <span className="block text-base font-semibold">From</span>
            <input
              type="date"
              value={from ?? ""}
              onChange={(e) => onChange(e.target.value || null, to)}
              className={`${controlClass} mt-1 w-full`}
            />
          </label>
          <label className="mt-3 block">
            <span className="block text-base font-semibold">
              To <span className="font-normal text-ink/60">(optional)</span>
            </span>
            <input
              type="date"
              value={to ?? ""}
              onChange={(e) => onChange(from, e.target.value || null)}
              className={`${controlClass} mt-1 w-full`}
            />
          </label>
          <p className="mt-2 text-sm text-ink/60">Leave “To” empty for a single day. Pacific time.</p>
          <div className="mt-3 flex justify-between">
            <button
              type="button"
              onClick={() => onChange(null, null)}
              className="text-base font-semibold text-blue underline hover:no-underline"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
              className="text-base font-semibold text-blue underline hover:no-underline"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditLogList() {
  const [filters, setFilters] = useState<AuditFilters>(NO_AUDIT_FILTERS);
  const [searchText, setSearchText] = useState("");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actors, setActors] = useState<{ id: string; name: string }[]>([]);
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  // The live subscription outlives filter changes; it reads the current ones.
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Typing searches after a short pause, not on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => (f.search === searchText ? f : { ...f, search: searchText }));
    }, SEARCH_DELAY);
    return () => clearTimeout(timer);
  }, [searchText]);

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

  // Current roles for everyone on screen, fetched once per person.
  const missingRoleIds = [
    ...new Set(logs.map((l) => l.actorId).filter((id): id is string => !!id && !(id in roles))),
  ];
  const missingKey = missingRoleIds.join(",");
  useEffect(() => {
    if (!missingKey) return;
    const ids = missingKey.split(",");
    fetchActorRoles(ids).then((found) =>
      // Ids with no profile (deleted users) are remembered as "" so they are
      // not fetched again; "" renders no pill.
      setRoles((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, ""])), ...found })),
    );
  }, [missingKey]);

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

    return () => {
      if (seenTimer) clearTimeout(seenTimer);
      supabase.removeChannel(channel);
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

  const filtered = hasAuditFilters(filters) || searchText.trim() !== "";

  return (
    <div>
      {/* Filter bar: one row on a laptop, wrapping on narrower screens. */}
      <div className="flex flex-wrap items-center gap-3">
        {/* The search box takes whatever width the other controls leave. */}
        <label className="relative block w-full sm:w-auto sm:min-w-40 sm:flex-1">
          <span className="sr-only">Search the logs</span>
          <MagnifyingGlassIcon
            size={20}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink/60"
          />
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search history"
            className={`${controlClass} w-full min-w-0 pl-10`}
          />
        </label>
        <label className="block w-full sm:w-auto">
          <span className="sr-only">Person</span>
          <select
            className={`${controlClass} w-full sm:w-44`}
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
        <DateFilter
          from={filters.from}
          to={filters.to}
          onChange={(from, to) => setFilters({ ...filters, from, to })}
        />
        <label className="block w-full sm:w-auto">
          <span className="sr-only">Category</span>
          <select
            className={`${controlClass} w-full sm:w-40`}
            value={filters.category ?? ""}
            onChange={(e) => setFilters({ ...filters, category: e.target.value || null })}
          >
            <option value="">All actions</option>
            {AUDIT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block w-full sm:w-auto">
          <span className="sr-only">Made by</span>
          <select
            className={`${controlClass} w-full sm:w-52`}
            value={filters.source}
            onChange={(e) =>
              setFilters({ ...filters, source: e.target.value as AuditFilters["source"] })
            }
          >
            <option value="all">People &amp; automated</option>
            <option value="user">People only</option>
            <option value="automated">Automated only</option>
          </select>
        </label>
        {filtered && (
          <button
            type="button"
            onClick={() => {
              setSearchText("");
              setFilters(NO_AUDIT_FILTERS);
            }}
            className="text-base font-semibold text-blue underline hover:no-underline"
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
          {/* Scrolls sideways inside its own box on narrow screens, never the
              page itself. */}
          <div className="mt-5 max-w-full overflow-x-auto border-2 border-placeholder">
            <table className="w-full min-w-[960px] table-fixed text-left text-base">
              <thead className="border-b-2 border-placeholder bg-ink/5">
                <tr>
                  <th scope="col" className="w-64 px-3 py-3 font-semibold">User</th>
                  <th scope="col" className="w-32 px-3 py-3 font-semibold">Date</th>
                  <th scope="col" className="w-24 px-3 py-3 font-semibold">Time</th>
                  <th scope="col" className="w-44 px-3 py-3 font-semibold">Action</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const open = expanded.has(log.id);
                  const pill = actionPill(log);
                  const detailsId = `audit-log-${log.id}`;
                  return (
                    <Fragment key={log.id}>
                      {/* The whole row opens the details for a mouse; the
                          button in Description is the keyboard and
                          screen-reader control (its click bubbles here). */}
                      <tr
                        onClick={() => toggle(log.id)}
                        className={`cursor-pointer border-b border-placeholder align-middle hover:bg-ink/5 ${
                          open ? "bg-ink/5" : ""
                        }`}
                      >
                        <td className="px-3 py-3">
                          <UserCell
                            log={log}
                            role={log.actorId ? roles[log.actorId] : undefined}
                          />
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap" title={pacificTime(log.createdAt)}>
                          {pacificDate(log.createdAt)}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">{pacificClock(log.createdAt)}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-sm leading-snug font-bold whitespace-nowrap ${PILL_TONE_CLASS[pill.tone]}`}
                          >
                            {pill.label}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            aria-expanded={open}
                            aria-controls={detailsId}
                            className="flex w-full items-start gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                          >
                            <span className="min-w-0 flex-1 break-words">
                              <Summary text={log.summary} />
                            </span>
                            <CaretRightIcon
                              size={16}
                              aria-hidden="true"
                              className={`mt-1 shrink-0 text-ink/60 transition-transform duration-150 motion-reduce:transition-none ${
                                open ? "rotate-90" : ""
                              }`}
                            />
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr id={detailsId} className="border-b border-placeholder bg-ink/5">
                          <td colSpan={5} className="px-4 pt-1 pb-4">
                            <Details log={log} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
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
