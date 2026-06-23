import { FIRST_DAY } from "./dashboardConfig";

/*
  The shape every schedule event is rendered against. Keep this contract stable:
  in Phase 3 a Supabase row should map cleanly onto a DashboardEvent so nothing
  downstream (the calendar) has to change.
*/
export type DashboardEvent = {
  id: string;
  name: string;
  description?: string;
  location?: string;
  start: string; // ISO 8601
  end?: string; // ISO 8601
  allDay?: boolean;
};

/* --- date helpers (sample data only) ------------------------------------- *
 * Events are placed by weekday NAME so it reads exactly like it looks on the
 * calendar — "Sunday" really lands on Sunday. The dates are computed relative
 * to the current week, so the sample schedule always fills the visible week.
 * ------------------------------------------------------------------------- */

type Weekday =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

const WEEKDAYS: Weekday[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// ISO timestamp for the given weekday of the CURRENT week at the given time.
//   at("Sunday", 9, 30)  ->  this week's Sunday at 9:30 AM
//   at("Friday", 18)     ->  this week's Friday at 6:00 PM  (minute defaults to 0)
// hour is 24-hour (0–23): 9 = 9 AM, 14 = 2 PM, 18 = 6 PM.
function at(day: Weekday, hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);

  // Step back to the start of the visible week (respects FIRST_DAY)...
  const toWeekStart = (d.getDay() - FIRST_DAY + 7) % 7;
  d.setDate(d.getDate() - toWeekStart);

  // ...then forward to the requested weekday within that week.
  const toWeekday = (WEEKDAYS.indexOf(day) - FIRST_DAY + 7) % 7;
  d.setDate(d.getDate() + toWeekday);

  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/* --- DATA SEAM ----------------------------------------------------------- *
 * Phase 2 returns this local sample array. To add or remove events, edit the
 * list below: copy an object, give it a new `id`, and set its name / time /
 * location. In Phase 3, replace the body of getDashboardEvents() with a
 * Supabase fetch (and add a realtime subscription in WeekCalendar where
 * setEvents is called) — callers only depend on the DashboardEvent[] return
 * type, so swapping the source is a one-spot change.
 * ------------------------------------------------------------------------- */
export function getDashboardEvents(): DashboardEvent[] {
  return [
    {
      id: "1",
      name: "Sunday Service",
      description: "Weekly community gathering. All welcome.",
      location: "Main Hall",
      start: at("Sunday", 9, 0),
      end: at("Sunday", 10, 30),
    },
    {
      id: "2",
      name: "Community Lunch",
      description: "Free lunch, open to everyone.",
      location: "Dining Room",
      start: at("Monday", 12, 0),
      end: at("Monday", 13, 30),
    },
    {
      id: "3",
      name: "Youth Group",
      description: "For ages 12–18.",
      location: "Room B",
      start: at("Tuesday", 16, 0),
      end: at("Tuesday", 17, 30),
    },
    {
      id: "4",
      name: "Volunteer Meeting",
      location: "Conference Room",
      start: at("Tuesday", 18, 0),
      end: at("Tuesday", 19, 0),
    },
    {
      id: "5",
      name: "Bible Study",
      description: "Bring your own copy.",
      location: "Library",
      start: at("Wednesday", 10, 0),
      end: at("Wednesday", 11, 0),
    },
    {
      id: "6",
      name: "Food Bank",
      description: "Distribution and intake.",
      location: "Annex",
      start: at("Thursday", 9, 30),
      end: at("Thursday", 12, 0),
    },
    {
      id: "7",
      name: "Evening Concert",
      description: "Local choir performance.",
      location: "Main Hall",
      start: at("Friday", 18, 0),
      end: at("Friday", 19, 30),
    },
    {
      id: "8",
      name: "Community Breakfast",
      description: "Pancakes and coffee to start the weekend.",
      location: "Dining Room",
      start: at("Saturday", 9, 0),
      end: at("Saturday", 10, 30),
    },

    {
      id: "9",
      name: "Random Event",
      description: "This event is random and has no real description. I'm making this description long to test if this will bug.",
      location: "Random Location",
      start: at("Sunday", 11, 0),
      end: at("Sunday", 18, 0),
    },

  ];
}
