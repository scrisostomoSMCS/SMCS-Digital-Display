"use client";

import WeekCalendar from "@/components/calendar/WeekCalendar";
import { fetchMySchedule } from "@/lib/events";
import { useLiveEvents } from "@/lib/useLiveEvents";

/*
  Personal Calendar data source: only the current user's signed-up events (RLS
  enforces ownership). Re-loads on changes to the user's signups or to the
  underlying events. Feeds the same shared WeekCalendar as the dashboard.
*/
export default function ScheduleCalendar() {
  const events = useLiveEvents(fetchMySchedule, ["signups", "events"]);
  return <WeekCalendar events={events} />;
}
