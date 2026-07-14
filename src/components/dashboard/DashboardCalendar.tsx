"use client";

import WeekCalendar from "@/components/calendar/WeekCalendar";
import { fetchDashboardEvents } from "@/lib/events";
import { useLiveEvents } from "@/lib/useLiveEvents";

/*
  Live Calendar data source: ALL events, kept live on changes to the events
  table. Feeds the shared WeekCalendar.
*/
export default function DashboardCalendar() {
  const events = useLiveEvents(fetchDashboardEvents, ["events"]);
  return <WeekCalendar events={events} />;
}
