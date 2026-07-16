"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  DateSelectArg,
  EventClickArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { supabase } from "@/lib/supabase";
import {
  fetchAllEvents,
  createEvent,
  updateEvent,
  moveEvent,
  deleteEvent,
  type ManageEvent,
} from "@/lib/manageEvents";
import EventForm, { type EventFormState } from "./EventForm";
import { DEFAULT_EVENT_COLOR } from "@/lib/eventColors";

/*
  Interactive, Google-Calendar-style editor for employees/admins. SEPARATE from
  the view-only Live Calendar component on purpose: editing controls must never
  appear on the public/TV display. All writes go to the one Supabase `events`
  table; the dashboard and app pick up changes through their existing realtime
  subscriptions. Desktop keeps the full week; smaller screens use a day view.
*/

const pad = (n: number) => String(n).padStart(2, "0");
const COMPACT_QUERY = "(max-width: 1023px)";

// Times are UTC wall-clock. FullCalendar runs in timeZone="UTC", so a Date's
// UTC fields equal the slot the employee sees. Convert to/from the
// datetime-local string the form uses.
function dateToLocal(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate(),
  )}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
function localToISO(s: string): string {
  return new Date(`${s}:00Z`).toISOString();
}

type OpenForm = {
  mode: "create" | "edit";
  id: string | null;
  initial: EventFormState;
};

export default function ManageCalendar() {
  const calendarRef = useRef<FullCalendar>(null);
  const [mounted, setMounted] = useState(false);
  const [compact, setCompact] = useState(false);
  const [events, setEvents] = useState<ManageEvent[]>([]);
  const [form, setForm] = useState<OpenForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setEvents(await fetchAllEvents());
  }, []);

  useEffect(() => {
    setMounted(true);
    load();
    // Stay in sync with edits from anywhere (other staff, the app), same
    // realtime channel pattern the rest of the app uses.
    const channel = supabase
      .channel("manage-events")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Keep the full week editor on desktop and use one readable day at a time
  // on smaller screens. FullCalendar requires an imperative view change after
  // it has mounted when the media query changes.
  useEffect(() => {
    calendarRef.current
      ?.getApi()
      .changeView(compact ? "timeGridDay" : "timeGridWeek");
  }, [compact]);

  // Each event renders in its chosen color (the same tint it shows on the Live
  // Calendar). Off-dashboard events are dimmed (see .evt-off-board) so staff can
  // still tell at a glance which events are on the public board.
  const fcEvents: EventInput[] = events.map((e) => ({
    id: e.id,
    title: e.name,
    start: e.start,
    end: e.end,
    backgroundColor: e.color || DEFAULT_EVENT_COLOR,
    borderColor: e.color || DEFAULT_EVENT_COLOR,
    classNames: e.showOnDashboard ? undefined : ["evt-off-board"],
    extendedProps: {
      description: e.description,
      location: e.location,
      showOnDashboard: e.showOnDashboard,
      color: e.color || DEFAULT_EVENT_COLOR,
    },
  }));

  // Drag-select an empty range → create.
  function handleSelect(sel: DateSelectArg) {
    setError(null);
    setForm({
      mode: "create",
      id: null,
      initial: {
        name: "",
        description: "",
        location: "",
        startLocal: dateToLocal(sel.start),
        endLocal: dateToLocal(sel.end),
        showOnDashboard: true,
        color: DEFAULT_EVENT_COLOR,
      },
    });
    sel.view.calendar.unselect();
  }

  // Click an event → edit.
  function handleEventClick(click: EventClickArg) {
    setError(null);
    const e = click.event;
    setForm({
      mode: "edit",
      id: e.id,
      initial: {
        name: e.title,
        description: (e.extendedProps.description as string) ?? "",
        location: (e.extendedProps.location as string) ?? "",
        startLocal: e.start ? dateToLocal(e.start) : "",
        endLocal: e.end ? dateToLocal(e.end) : "",
        showOnDashboard: Boolean(e.extendedProps.showOnDashboard),
        color: (e.extendedProps.color as string) ?? DEFAULT_EVENT_COLOR,
      },
    });
  }

  // Drag-move / resize → persist new times directly (no form). On failure,
  // reload from the DB to snap back to the truth.
  async function persistTimes(id: string, start: Date | null, end: Date | null) {
    if (!start) return;
    const err = await moveEvent(
      id,
      start.toISOString(),
      end ? end.toISOString() : null,
    );
    if (err) load();
  }
  const handleEventDrop = (info: EventDropArg) =>
    persistTimes(info.event.id, info.event.start, info.event.end);
  const handleEventResize = (info: EventResizeDoneArg) =>
    persistTimes(info.event.id, info.event.start, info.event.end);

  async function handleSave(s: EventFormState) {
    if (!form) return;
    setSaving(true);
    setError(null);
    const payload = {
      name: s.name.trim(),
      description: s.description,
      location: s.location,
      start: localToISO(s.startLocal),
      end: localToISO(s.endLocal),
      showOnDashboard: s.showOnDashboard,
      color: s.color,
    };
    const err =
      form.mode === "create"
        ? await createEvent(payload)
        : await updateEvent(form.id!, payload);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setForm(null);
    load();
  }

  async function handleDelete() {
    if (!form?.id) return;
    setSaving(true);
    setError(null);
    const err = await deleteEvent(form.id);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setForm(null);
    load();
  }

  if (!mounted) return <div className="h-full" aria-hidden="true" />;

  return (
    <div className="manage-calendar h-full">
      <FullCalendar
        ref={calendarRef}
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView={compact ? "timeGridDay" : "timeGridWeek"}
        headerToolbar={
          compact
            ? { left: "prev,next", center: "title", right: "today" }
            : {
                left: "prev,next today",
                center: "title",
                right: "timeGridWeek,timeGridDay",
              }
        }
        timeZone="UTC"
        nowIndicator
        // Full interactive mode, click-to-create, drag, resize.
        selectable
        selectMirror
        editable
        eventResizableFromStart
        slotDuration="00:30:00"
        scrollTime="08:00:00"
        allDaySlot={false}
        height="100%"
        events={fcEvents}
        select={handleSelect}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
      />

      {form && (
        <EventForm
          mode={form.mode}
          initial={form.initial}
          saving={saving}
          error={error}
          onSave={handleSave}
          onDelete={form.mode === "edit" ? handleDelete : undefined}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}
