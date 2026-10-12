/*
  Fixed English / Spanish day and month names for the Digital Bulletin. Used
  instead of Intl so a date on the wall never depends on the TV browser's
  locale, and never on a translation API. Index by Date#getUTCDay /
  getUTCMonth of a date built with Date.UTC (see lib/eventFlyer, lib/weather).
*/
export const WEEKDAYS = [
  ["Sunday", "domingo"],
  ["Monday", "lunes"],
  ["Tuesday", "martes"],
  ["Wednesday", "miércoles"],
  ["Thursday", "jueves"],
  ["Friday", "viernes"],
  ["Saturday", "sábado"],
] as const;

export const MONTHS = [
  ["January", "enero"],
  ["February", "febrero"],
  ["March", "marzo"],
  ["April", "abril"],
  ["May", "mayo"],
  ["June", "junio"],
  ["July", "julio"],
  ["August", "agosto"],
  ["September", "septiembre"],
  ["October", "octubre"],
  ["November", "noviembre"],
  ["December", "diciembre"],
] as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// "YYYY-MM-DD" as a UTC-midnight Date, or null if it is not a real date.
export function utcDate(ymd: string): Date | null {
  if (!DATE_RE.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(date.getTime()) || date.getUTCDate() !== d ? null : date;
}

// The display's LOCAL calendar date as "YYYY-MM-DD" (same "today" rule as
// todayMenuDay in lib/weeklyMenu).
export function localYmd(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
