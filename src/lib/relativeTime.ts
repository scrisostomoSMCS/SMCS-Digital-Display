/*
  Small "5 min ago" formatter for the staff manage page. No date library: the
  project has none, and Intl.RelativeTimeFormat covers this on its own.

  Coarse on purpose. Employees want to know whether a slide was touched a moment
  ago or last month, so the output stays at one unit ("3 hr ago", not "3 hr 12
  min ago"), and anything older than a week becomes a plain date, where the
  exact age has stopped being the useful part. The precise value is always one
  hover away (see absoluteTime, used as the title attribute).
*/

// Only used for days, where it yields "yesterday" rather than "1 day ago".
// Minutes and hours are written out by hand below: the "short" style renders
// them as "4 min. ago", and that abbreviating period looks like a typo sitting
// in the middle of a slide header.
const rtf = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});

const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: "long",
  timeStyle: "short",
});

const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/*
  Human age of `iso`, or null when there is nothing trustworthy to show.

  null covers rows written before updated_at existed (the column is NULL for
  them, see migration 0023) and any unparseable value. Callers render nothing in
  that case - an honest blank beats a guessed timestamp.

  A future timestamp is clamped to "just now". The database stamps updated_at,
  so this only happens when the viewer's own clock is behind the server's, and
  "in 4 min ago" would read as a bug in the page rather than a clock problem.
*/
export function relativeTime(
  iso: string | null | undefined,
  now: number = Date.now(),
): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;

  const elapsed = now - then;
  if (elapsed < 45 * 1000) return "just now";
  if (elapsed < HOUR) return `${Math.round(elapsed / MINUTE)} min ago`;
  if (elapsed < DAY) {
    const hours = Math.round(elapsed / HOUR);
    return `${hours} ${hours === 1 ? "hr" : "hrs"} ago`;
  }
  if (elapsed < WEEK) return rtf.format(-Math.round(elapsed / DAY), "day");
  return `on ${dateFmt.format(then)}`;
}

// Full date + time for the hover title, so the coarse label above is never the
// only thing available. Same shape as the calendar's formatters in EventModal.
export function absoluteTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return dateTimeFmt.format(then);
}
