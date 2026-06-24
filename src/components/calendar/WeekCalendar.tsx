"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import type {
  EventClickArg,
  EventContentArg,
  EventInput,
} from "@fullcalendar/core";
import {
  DAYS_SHOWN,
  FIRST_DAY,
  DAY_START_HOUR,
  DAY_END_HOUR,
} from "@/lib/dashboardConfig";
import { type DashboardEvent } from "@/lib/events";
import EventModal, { type SelectedEvent } from "./EventModal";

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

// Times are read in UTC so the stored wall-clock time is shown as-is to every
// viewer (TV and phones in any timezone) — matches the calendar's timeZone="UTC".
function hourMin(d: Date): string {
  const h = d.getUTCHours() % 12 || 12;
  const m = d.getUTCMinutes();
  return m === 0 ? `${h}` : `${h}:${String(m).padStart(2, "0")}`;
}
const meridiem = (d: Date) => (d.getUTCHours() < 12 ? "am" : "pm");

// Short range like "9 – 10:30am" / "9:30am – 12pm" — kept compact so the
// time + location usually fits on one line and the block stays short.
function timeRange(start: Date | null, end: Date | null): string {
  if (!start) return "";
  if (!end) return `${hourMin(start)}${meridiem(start)}`;
  const startMer = meridiem(start) === meridiem(end) ? "" : meridiem(start);
  return `${hourMin(start)}${startMer} – ${hourMin(end)}${meridiem(end)}`;
}

// Custom event body: bold title, then a compact "time · location" line.
function renderEvent(arg: EventContentArg) {
  const location = arg.event.extendedProps.location as string | undefined;
  const time = timeRange(arg.event.start, arg.event.end);
  return (
    <div className="px-1 leading-tight">
      <div className="font-bold">{arg.event.title}</div>
      {(time || location) && (
        <div className="text-xs opacity-90 md:text-sm">
          {time}
          {time && location ? " · " : ""}
          {location}
        </div>
      )}
    </div>
  );
}

const NARROW_QUERY = "(max-width: 768px)";

/*
  Presentational week calendar. Role-agnostic: it just renders whatever events
  it's given, so the Live Dashboard (all events) and the Personal Calendar (a
  user's own signups) — and future employee/admin views — reuse it unchanged.
  Data loading + realtime live in thin wrapper components, not here.
*/
type WeekCalendarProps = {
  events: DashboardEvent[];
};

export default function WeekCalendar({ events }: WeekCalendarProps) {
  const calRef = useRef<FullCalendar>(null);

  // Render FullCalendar only after mount: avoids any SSR/window issues and
  // prevents a hydration mismatch from client-only state (viewport, events).
  const [mounted, setMounted] = useState(false);

  // Phone vs. TV: a 7-column time grid is unreadable on a phone, so reflow to
  // a vertical agenda list when the viewport is narrow.
  const [narrow, setNarrow] = useState(false);

  // The event whose detail popup is open (null = no popup).
  const [selected, setSelected] = useState<SelectedEvent | null>(null);

  // Zero-pad an hour into the "HH:00:00" form FullCalendar's slot times expect.
  const slotTime = (h: number) => `${String(h).padStart(2, "0")}:00:00`;

  // Clicking an event opens its detail popup. This is the only interaction the
  // display allows — everything else stays locked (see the FullCalendar props).
  function handleEventClick(arg: EventClickArg) {
    arg.jsEvent.preventDefault();
    setSelected({
      name: arg.event.title,
      description: arg.event.extendedProps.description as string | undefined,
      location: arg.event.extendedProps.location as string | undefined,
      start: arg.event.start,
      end: arg.event.end,
      allDay: arg.event.allDay,
    });
  }

  useEffect(() => {
    setMounted(true);
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
        // Show stored times as fixed wall-clock times (no per-viewer timezone
        // shift): an event saved as 9:00 reads as 9:00 everywhere.
        timeZone="UTC"
        events={fcEvents}
        eventContent={renderEvent}
        eventTimeFormat={{
          hour: "numeric",
          minute: "2-digit",
          meridiem: "short",
        }}
        dayHeaderFormat={{ weekday: "long", month: "short", day: "numeric" }}
        // No toolbar: the column headers already show each day's date, so the
        // week-range title would just be redundant chrome. Dropping it lets the
        // grid start right under the control row and fill the full height.
        headerToolbar={false}
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
        // --- View-only: the only interaction allowed is clicking an event to
        // open its detail popup. Editing/dragging/selecting/navigation all stay
        // disabled (editing arrives in a later phase). eventInteractive makes
        // events keyboard-focusable so the popup is reachable without a mouse.
        eventInteractive
        eventClick={handleEventClick}
        editable={false}
        selectable={false}
        navLinks={false}
      />

      <EventModal event={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
