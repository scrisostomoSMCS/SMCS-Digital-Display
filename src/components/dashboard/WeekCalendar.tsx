"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import type { EventContentArg, EventInput } from "@fullcalendar/core";
import {
  DAYS_SHOWN,
  FIRST_DAY,
  DAY_START_HOUR,
  DAY_END_HOUR,
} from "@/lib/dashboardConfig";
import { getDashboardEvents, type DashboardEvent } from "@/lib/events";

// Map our stable DashboardEvent shape onto FullCalendar's event input. Keeping
// this here means the rest of the app never touches FullCalendar's types.
function toEventInput(e: DashboardEvent): EventInput {
  return {
    id: e.id,
    title: e.name,
    start: e.start,
    end: e.end,
    allDay: e.allDay,
    extendedProps: { description: e.description, location: e.location },
  };
}

// Custom event body: time, name, then location, each on its own line so it
// stays legible from across a room rather than truncating to one tight row.
function renderEvent(arg: EventContentArg) {
  const location = arg.event.extendedProps.location as string | undefined;
  return (
    <div className="px-1 py-0.5 leading-tight">
      {arg.timeText && (
        <div className="text-sm font-semibold opacity-90 md:text-base">
          {arg.timeText}
        </div>
      )}
      <div className="font-bold">{arg.event.title}</div>
      {location && (
        <div className="text-sm opacity-90 md:text-base">{location}</div>
      )}
    </div>
  );
}

const NARROW_QUERY = "(max-width: 768px)";

export default function WeekCalendar() {
  const calRef = useRef<FullCalendar>(null);

  // Calendar state. Today this is seeded once from the local sample provider.
  // PHASE 3 SEAM: replace getDashboardEvents() with a Supabase fetch and add a
  // realtime subscription that calls setEvents — this is the single update point.
  const [events, setEvents] = useState<DashboardEvent[]>([]);

  // Render FullCalendar only after mount: avoids any SSR/window issues and
  // keeps date-derived sample data off the server-rendered HTML (no mismatch).
  const [mounted, setMounted] = useState(false);

  // Phone vs. TV: a 7-column time grid is unreadable on a phone, so reflow to
  // a vertical agenda list when the viewport is narrow.
  const [narrow, setNarrow] = useState(false);

  // Zero-pad an hour into the "HH:00:00" form FullCalendar's slot times expect.
  const slotTime = (h: number) => `${String(h).padStart(2, "0")}:00:00`;

  useEffect(() => {
    setMounted(true);
    setEvents(getDashboardEvents());
    // PHASE 3 SEAM (realtime):
    // const channel = supabase.channel("events")
    //   .on("postgres_changes", { ... }, () => setEvents(fetchedRows))
    //   .subscribe();
    // return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // FullCalendar's view only applies on mount, so switch it imperatively when
  // the viewport crosses the phone/TV breakpoint.
  useEffect(() => {
    calRef.current?.getApi().changeView(narrow ? "list" : "timeGrid");
  }, [narrow]);

  const fcEvents = useMemo(() => events.map(toEventInput), [events]);

  if (!mounted) {
    return <div className="tv-calendar h-full" aria-hidden="true" />;
  }

  return (
    <div className="tv-calendar h-full">
      <FullCalendar
        ref={calRef}
        plugins={[timeGridPlugin, listPlugin]}
        initialView={narrow ? "list" : "timeGrid"}
        // DAYS_SHOWN drives both views; dateAlignment pins the range to the
        // start of the current week so it always shows "this week".
        views={{
          timeGrid: { duration: { days: DAYS_SHOWN }, dateAlignment: "week" },
          list: { duration: { days: DAYS_SHOWN }, dateAlignment: "week" },
        }}
        firstDay={FIRST_DAY}
        events={fcEvents}
        eventContent={renderEvent}
        eventTimeFormat={{
          hour: "numeric",
          minute: "2-digit",
          meridiem: "short",
        }}
        dayHeaderFormat={{ weekday: "long", month: "short", day: "numeric" }}
        headerToolbar={{ left: "", center: "title", right: "" }}
        height="100%"
        // Fit the whole week on one screen: only show the active hours and let
        // expandRows stretch them to fill the height — no scrolling in any
        // direction. Adjust the window via DAY_START_HOUR / DAY_END_HOUR.
        slotMinTime={slotTime(DAY_START_HOUR)}
        slotMaxTime={slotTime(DAY_END_HOUR)}
        slotDuration="01:00:00"
        slotLabelFormat={{ hour: "numeric", meridiem: "short" }}
        allDaySlot={false}
        expandRows
        nowIndicator={false}
        // --- Display-only: this is a public wall-mounted TV, so every form of
        // interaction is disabled (no clicking, dragging, editing, navigation,
        // day links, or now-indicator). Editing arrives in a later phase.
        editable={false}
        selectable={false}
        navLinks={false}
        eventInteractive={false}
      />
    </div>
  );
}
