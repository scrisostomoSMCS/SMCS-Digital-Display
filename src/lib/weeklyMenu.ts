/*
  The "Weekly Menu" custom slide: a week of Breakfast / Lunch / Dinner, stored
  in the slides.menu jsonb column (migration 0025). Pure helpers only, no
  Supabase — shared by the manage editor and the display renderer.

  Stored shape (every key optional on read; parseMenu fills the gaps):
    {
      "weekOf": "2026-09-28",            // the Monday, a plain calendar date
      "days": {
        "mon": {
          "breakfast": { "items": ["Scrambled eggs"], "itemsEs": ["Huevos revueltos"] },
          "lunch":     { "items": [], "itemsEs": [] },
          "dinner":    { "items": [], "itemsEs": [] }
        },
        "tue": { ... } ... "sun": { ... }
      }
    }

  Days and meals are keyed objects rather than arrays so one missing or bad cell
  can never shift the others. Spanish pairs with English by position, the same
  convention as a "Title + list" slide's items / itemsEs. Day names and meal
  labels are NOT stored: they are the fixed bilingual strings below.
*/

export const MENU_DAYS = [
  { key: "mon", label: "Monday", labelEs: "Lunes" },
  { key: "tue", label: "Tuesday", labelEs: "Martes" },
  { key: "wed", label: "Wednesday", labelEs: "Miércoles" },
  { key: "thu", label: "Thursday", labelEs: "Jueves" },
  { key: "fri", label: "Friday", labelEs: "Viernes" },
  { key: "sat", label: "Saturday", labelEs: "Sábado" },
  { key: "sun", label: "Sunday", labelEs: "Domingo" },
] as const;

export const MENU_MEALS = [
  { key: "breakfast", label: "Breakfast", labelEs: "Desayuno" },
  { key: "lunch", label: "Lunch", labelEs: "Almuerzo" },
  { key: "dinner", label: "Dinner", labelEs: "Cena" },
] as const;

export type MenuDayKey = (typeof MENU_DAYS)[number]["key"];
export type MenuMealKey = (typeof MENU_MEALS)[number]["key"];

export type MenuMeal = { items: string[]; itemsEs: string[] };

export type WeeklyMenu = {
  weekOf: string | null; // "YYYY-MM-DD" Monday, or null before one is picked
  days: Record<MenuDayKey, Record<MenuMealKey, MenuMeal>>;
};

export function emptyMenu(): WeeklyMenu {
  const days = {} as WeeklyMenu["days"];
  for (const d of MENU_DAYS) {
    days[d.key] = {} as Record<MenuMealKey, MenuMeal>;
    for (const m of MENU_MEALS) days[d.key][m.key] = { items: [], itemsEs: [] };
  }
  return { weekOf: null, days };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const stringList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/*
  Always returns a complete 7 x 3 grid. Null (every non-menu slide, and menu
  slides saved before a cell was filled), a malformed blob, or a wrong-typed
  cell all read as empty cells rather than throwing, so the display can never
  blank on bad data.
*/
export function parseMenu(raw: unknown): WeeklyMenu {
  const menu = emptyMenu();
  const obj = asRecord(raw);
  if (typeof obj.weekOf === "string" && DATE_RE.test(obj.weekOf)) {
    menu.weekOf = obj.weekOf;
  }
  const days = asRecord(obj.days);
  for (const d of MENU_DAYS) {
    const day = asRecord(days[d.key]);
    for (const m of MENU_MEALS) {
      const meal = asRecord(day[m.key]);
      menu.days[d.key][m.key] = {
        items: stringList(meal.items),
        itemsEs: stringList(meal.itemsEs),
      };
    }
  }
  return menu;
}

// Trim every item and drop blank lines, for saving what the editor's
// one-item-per-line textareas produced.
export function cleanMenu(menu: WeeklyMenu): WeeklyMenu {
  const clean = (list: string[]) => list.map((s) => s.trim()).filter(Boolean);
  const out = parseMenu(menu);
  for (const d of MENU_DAYS) {
    for (const m of MENU_MEALS) {
      const meal = out.days[d.key][m.key];
      out.days[d.key][m.key] = { items: clean(meal.items), itemsEs: clean(meal.itemsEs) };
    }
  }
  return out;
}

/* --- dates ---------------------------------------------------------------- */

/*
  Week math works on "YYYY-MM-DD" strings through Date.UTC, never local time,
  so a date picked on a staff laptop can't slide a day across a time zone or a
  DST change. Month and year rollovers come free from Date.UTC.
*/
function parseDate(ymd: string): Date | null {
  if (!DATE_RE.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(date.getTime()) ? null : date;
}

const toYmd = (d: Date) => d.toISOString().slice(0, 10);

const addDays = (d: Date, n: number) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));

// The Monday of the week containing `ymd` (weeks run Monday to Sunday).
export function mondayOf(ymd: string): string | null {
  const d = parseDate(ymd);
  if (!d) return null;
  const sinceMonday = (d.getUTCDay() + 6) % 7;
  return toYmd(addDays(d, -sinceMonday));
}

const mdy = (d: Date) =>
  `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;

// "9/28/2026–10/4/2026" for the week starting at `monday`.
export function weekRangeLabel(monday: string): string {
  const start = parseDate(monday);
  if (!start) return "";
  return `${mdy(start)}–${mdy(addDays(start, 6))}`;
}

export const weekTitle = (monday: string) =>
  `This Week's Menu ${weekRangeLabel(monday)}`;

// Same M/D/YYYY dates as English so the screen never shows two date formats.
export const weekTitleEs = (monday: string) =>
  `Menú de la semana ${weekRangeLabel(monday)}`;

/*
  Which day of `weekOf`'s week is today, or null when today is outside it.

  "Today" is the display's LOCAL calendar date, the same rule fetchTodaysEvents
  (lib/events.ts) uses for the Events Today page. The UTC wall-clock convention
  governs how event times are stored; using the UTC date here instead would move
  the highlight to tomorrow every evening (after 5 PM in Pacific time).
*/
export function todayMenuDay(weekOf: string | null, now = new Date()): MenuDayKey | null {
  const start = weekOf ? parseDate(weekOf) : null;
  if (!start) return null;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const offset = Math.round((today - start.getTime()) / 86_400_000);
  return offset >= 0 && offset < 7 ? MENU_DAYS[offset].key : null;
}
