import type { DashboardEvent } from "./events";

/*
  Weekly recurring events (migration 0035). A series is ONE events row; this
  module turns it into the dated occurrences a screen shows. Pure functions, no
  Supabase: every calendar, the Digital Schedule, and the manage editor call
  expandEvents with the range they display.

  Everything is UTC wall-clock (see AGENTS.md): the weekday, the date, and the
  time of day all come from the stored UTC fields, never the viewer's timezone.
*/

export type Recurrence = {
  days: number[]; // 0 = Sunday … 6 = Saturday, sorted
  until?: string; // "YYYY-MM-DD", inclusive; absent = repeats indefinitely
  exceptions: string[]; // "YYYY-MM-DD" dates skipped
};

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");

// UTC date of a timestamp as "YYYY-MM-DD".
export function utcDateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// UTC midnight of a timestamp.
function utcMidnight(ms: number): number {
  return ms - (((ms % DAY_MS) + DAY_MS) % DAY_MS);
}

// Build the Recurrence a DB row describes, or undefined for a one-time event.
export function recurrenceFromColumns(
  days: number[] | null,
  until: string | null,
  exceptions: string[] | null,
): Recurrence | undefined {
  if (!days || days.length === 0) return undefined;
  return {
    days: [...days].sort((a, b) => a - b),
    until: until ?? undefined,
    exceptions: exceptions ?? [],
  };
}

// "Mon, Wed, Fri" (Sunday-first, matching the day toggles), or "daily" when
// all seven are set (the form's "Daily" box), so labels read "Repeats daily".
export function formatRepeatDays(days: number[]): string {
  if (days.length === 7) return "daily";
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => DAY_SHORT[d])
    .join(", ");
}

// "Repeats Mon, Wed, Fri" — the label staff see on the calendar and the form.
export function repeatsLabel(r: Recurrence): string {
  return `Repeats ${formatRepeatDays(r.days)}`;
}

// "YYYY-MM-DD" → "Tue, Nov 25" (read in UTC so the date never shifts).
export function formatDateKey(key: string): string {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/*
  Expand every series in `events` into its occurrences that overlap
  [rangeStart, rangeEnd). One-time events pass through untouched, so their
  behavior is exactly what it was before recurrence existed.

  Each occurrence keeps the series' time of day and length, gets the id
  `${seriesId}@YYYY-MM-DD` (unique for React keys and FullCalendar), and carries
  seriesId + occurrenceDate so the editor can open the series it belongs to.
  The scan starts one day before the range so an overnight occurrence that began
  the previous evening still shows on the morning it runs into.

  With no range (a calendar that hasn't reported its dates yet) series are
  omitted rather than shown at their first date.
*/
export function expandEvents<T extends DashboardEvent>(
  events: T[],
  rangeStart: Date | null,
  rangeEnd: Date | null,
): T[] {
  const out: T[] = [];
  for (const e of events) {
    if (!e.recurrence) {
      out.push(e);
      continue;
    }
    if (rangeStart && rangeEnd) out.push(...expandSeries(e, rangeStart, rangeEnd));
  }
  return out;
}

function expandSeries<T extends DashboardEvent>(
  e: T,
  rangeStart: Date,
  rangeEnd: Date,
): T[] {
  const r = e.recurrence!;
  const startMs = Date.parse(e.start);
  const endMs = e.end ? Date.parse(e.end) : null;
  if (Number.isNaN(startMs)) return [];

  const firstDay = utcMidnight(startMs);
  const timeOfDay = startMs - firstDay;
  const duration = endMs === null || Number.isNaN(endMs) ? null : endMs - startMs;
  const fromMs = rangeStart.getTime();
  const toMs = rangeEnd.getTime();
  const untilMs = r.until ? Date.parse(`${r.until}T00:00:00Z`) : null;
  const skipped = new Set(r.exceptions);
  const days = new Set(r.days);

  const out: T[] = [];
  let day = Math.max(firstDay, utcMidnight(fromMs) - DAY_MS);
  // The calendars show a week or a day; the cap only guards against a
  // runaway range, never a real view.
  for (let i = 0; i < 400 && day < toMs; i++, day += DAY_MS) {
    if (untilMs !== null && day > untilMs) break;
    if (!days.has(new Date(day).getUTCDay())) continue;
    const key = utcDateKey(day);
    if (skipped.has(key)) continue;

    const occStart = day + timeOfDay;
    const occEnd = duration === null ? null : occStart + duration;
    if (occStart >= toMs) continue;
    if ((occEnd ?? occStart + 1) <= fromMs) continue;

    out.push({
      ...e,
      id: `${e.id}@${key}`,
      seriesId: e.id,
      occurrenceDate: key,
      start: new Date(occStart).toISOString(),
      end: occEnd === null ? undefined : new Date(occEnd).toISOString(),
    });
  }
  return out;
}

/*
  Form-side state for the "Repeats weekly" fields, shared by Quick add and the
  calendar's event form (components/manage/RepeatFields).
*/
export type RepeatState = {
  on: boolean;
  days: number[];
  until: string; // "YYYY-MM-DD" or "" for no end
};

export const REPEAT_OFF: RepeatState = { on: false, days: [], until: "" };

// Repeat fields for an existing event (or REPEAT_OFF for a one-time one).
export function repeatStateFrom(r: Recurrence | undefined): RepeatState {
  return r ? { on: true, days: [...r.days], until: r.until ?? "" } : REPEAT_OFF;
}

// Weekday (0–6) of a "YYYY-MM-DD…" date string, or null when blank/invalid.
export function weekdayOf(dateKey: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}/.test(dateKey)) return null;
  const ms = Date.parse(`${dateKey.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(ms) ? null : new Date(ms).getUTCDay();
}

/*
  Validation for the repeat fields. `startLocal` / `endLocal` are the forms'
  "YYYY-MM-DDTHH:mm" UTC wall-clock strings. Returns a message to show, or null
  when valid (or not repeating). The database enforces the same rules (0035).
*/
export function repeatError(
  repeat: RepeatState,
  startLocal: string,
  endLocal: string,
): string | null {
  if (!repeat.on) return null;
  if (repeat.days.length === 0) return "Pick at least one day for it to repeat on.";
  const startDate = startLocal.slice(0, 10);
  if (repeat.until && startDate && repeat.until < startDate) {
    return "“Ends on” can’t be before the event’s start date.";
  }
  const s = Date.parse(`${startLocal}:00Z`);
  const e = Date.parse(`${endLocal}:00Z`);
  if (!Number.isNaN(s) && !Number.isNaN(e) && e - s >= DAY_MS) {
    return "A repeating event must be shorter than 24 hours.";
  }
  return null;
}

// RepeatState → the Recurrence to save (null = one-time). Exceptions are not
// part of the form; they're changed only by Skip / Undo (setSkippedDates).
export function recurrenceToSave(
  repeat: RepeatState,
): { days: number[]; until: string | null } | null {
  if (!repeat.on || repeat.days.length === 0) return null;
  return {
    days: [...repeat.days].sort((a, b) => a - b),
    until: repeat.until || null,
  };
}
