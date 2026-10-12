/*
  The "Event / Flyer" custom slide: one event (job fair, flu shot clinic, ID
  drive) with a big, scannable when-and-where block. Stored in the slides.content
  jsonb column (migration 0027). Pure helpers only, no Supabase — shared by the
  manage editor, the display renderer, and the server-side translator.

  Stored shape (every key optional on read; parseEventFlyer fills the gaps):
    {
      "date": "2026-10-14",        // a plain calendar date
      "startTime": "09:00",        // 24-hour "HH:MM", or absent
      "endTime": "14:00",
      "location": "Dining Hall",
      "locationEs": "Comedor"
    }

  The title and description are NOT in here: they reuse the slide's title /
  body columns, so the sidebar name, the "Updated" stamp, and translation work
  exactly as for every other template. Day and month names are not translated
  text either: they come from the fixed bilingual tables below, so the date
  never depends on a translation API or on the TV's browser locale.
*/

import { MONTHS, WEEKDAYS, utcDate } from "./bilingualDates";

export type EventFlyer = {
  date: string | null; // "YYYY-MM-DD"
  startTime: string | null; // "HH:MM"
  endTime: string | null; // "HH:MM"
  location: string;
  locationEs: string;
};

export function emptyEventFlyer(): EventFlyer {
  return { date: null, startTime: null, endTime: null, location: "", locationEs: "" };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const str = (v: unknown) => (typeof v === "string" ? v : "");
const match = (v: unknown, re: RegExp) =>
  typeof v === "string" && re.test(v) ? v : null;

/*
  Always returns a complete flyer. Null (a slide that was never an event flyer),
  another template's blob, or a wrong-typed field all read as empty rather than
  throwing, so the display can never blank on bad data.
*/
export function parseEventFlyer(raw: unknown): EventFlyer {
  const obj = asRecord(raw);
  return {
    date: match(obj.date, DATE_RE),
    startTime: match(obj.startTime, TIME_RE),
    endTime: match(obj.endTime, TIME_RE),
    location: str(obj.location),
    locationEs: str(obj.locationEs),
  };
}

// Trimmed, and an end time without a start time is dropped (it would read as
// "until 2 PM" with no start, which nobody means).
export function cleanEventFlyer(raw: unknown): EventFlyer {
  const f = parseEventFlyer(raw);
  return {
    ...f,
    endTime: f.startTime ? f.endTime : null,
    location: f.location.trim(),
    locationEs: f.locationEs.trim(),
  };
}

/* --- formatting ----------------------------------------------------------- */


/*
  "Tuesday, October 14" and "martes 14 de octubre", plus the English split into
  its weekday and "October 14" so a layout can stack them instead of letting
  the line break wherever it falls. Computed through Date.UTC
  from the stored string, never local time, so the weekday cannot slip a day
  on a TV in another time zone (same rule as lib/weeklyMenu). No year: a flyer
  is for an upcoming event, and the year only costs width.
*/
export type EventDateLabel = { en: string; es: string; weekday: string; monthDay: string };

export function formatEventDate(ymd: string | null): EventDateLabel | null {
  const date = ymd ? utcDate(ymd) : null;
  if (!date) return null;
  const d = date.getUTCDate();
  const [dayEn, dayEs] = WEEKDAYS[date.getUTCDay()];
  const [monEn, monEs] = MONTHS[date.getUTCMonth()];
  return {
    en: `${dayEn}, ${monEn} ${d}`,
    es: `${dayEs} ${d} de ${monEs}`,
    weekday: dayEn,
    monthDay: `${monEn} ${d}`,
  };
}

// "09:00" -> "9 AM", "13:30" -> "1:30 PM".
function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const hour = h % 12 || 12;
  const suffix = h < 12 ? "AM" : "PM";
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/*
  "9 AM – 2 PM", or just "9 AM". One line for both languages: AM/PM is how
  times are written on everything else in the building, so a second Spanish
  copy would add height without adding meaning.
*/
export function formatEventTime(start: string | null, end: string | null): string | null {
  if (!start || !TIME_RE.test(start)) return null;
  if (!end || !TIME_RE.test(end)) return formatTime(start);
  return `${formatTime(start)} – ${formatTime(end)}`;
}
