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

/* --- date helpers (sample data only) ------------------------------------- */

// Midnight at the start of the current week, respecting FIRST_DAY. The sample
// events are anchored to this so the demo always populates the visible week.
function startOfCurrentWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() - FIRST_DAY + 7) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

// ISO timestamp for `dayOffset` days into the current week at the given time.
function at(dayOffset: number, hour: number, minute = 0): string {
  const d = startOfCurrentWeek();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/* --- DATA SEAM ----------------------------------------------------------- *
 * Phase 2 returns this local sample array. In Phase 3, replace the body of
 * getDashboardEvents() with a Supabase fetch (and add a realtime subscription
 * in WeekCalendar where setEvents is called). Callers depend only on the
 * DashboardEvent[] return type, so swapping the source is a one-spot change.
 * ------------------------------------------------------------------------- */
export function getDashboardEvents(): DashboardEvent[] {
  return [
    {
      id: "1",
      name: "Morning Service",
      description: "Weekly community gathering",
      location: "Main Hall",
      start: at(0, 9, 0),
      end: at(0, 10, 30),
    },
    {
      id: "2",
      name: "Community Lunch",
      description: "Open to all",
      location: "Dining Room",
      start: at(1, 12, 0),
      end: at(1, 13, 30),
    },
    {
      id: "3",
      name: "Youth Group",
      description: "Ages 12–18",
      location: "Room B",
      start: at(2, 16, 0),
      end: at(2, 17, 30),
    },
    {
      id: "4",
      name: "Volunteer Meeting",
      location: "Conference Room",
      start: at(2, 18, 0),
      end: at(2, 19, 0),
    },
    {
      id: "5",
      name: "Bible Study",
      description: "Bring your own copy",
      location: "Library",
      start: at(3, 10, 0),
      end: at(3, 11, 0),
    },
    {
      id: "6",
      name: "Food Bank",
      description: "Distribution and intake",
      location: "Annex",
      start: at(4, 9, 30),
      end: at(4, 12, 0),
    },
    {
      id: "7",
      name: "Evening Concert",
      description: "Local choir performance",
      location: "Main Hall",
      start: at(5, 19, 0),
      end: at(5, 20, 30),
    },
    {
      id: "8",
      name: "Sunday Service",
      description: "All welcome",
      location: "Main Hall",
      start: at(6, 10, 0),
      end: at(6, 11, 30),
    },
  ];
}
