"use client";

import { useCallback, useEffect, useState } from "react";
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

/*
  Interactive, Google-Calendar-style editor for employees/admins. SEPARATE from
  the view-only Live Dashboard component on purpose: editing controls must never
  appear on the public/TV display. All writes go to the one Supabase `events`
  table; the dashboard and app pick up changes through their existing realtime
  subscriptions. This is a desktop tool, so it scrolls and is laid out for a
  computer (no TV-legibility constraints).
*/

const pad = (n: number) => String(n).padStart(2, "0");

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
  const [mounted, setMounted] = useState(false);
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
    // Stay in sync with edits from anywhere (other staff, the app) — same
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

  // Dashboard events render blue, off-dashboard (personal/appointments) teal,
  // so staff can tell at a glance what's on the public board.
  const fcEvents: EventInput[] = events.map((e) => ({
    id: e.id,
    title: e.name,
    start: e.start,
    end: e.end,
    backgroundColor: e.showOnDashboard ? "#0054a4" : "#00aaa6",
    borderColor: e.showOnDashboard ? "#0054a4" : "#00aaa6",
    extendedProps: {
      description: e.description,
      location: e.location,
      showOnDashboard: e.showOnDashboard,
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
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timeGridWeek,timeGridDay",
        }}
        timeZone="UTC"
        nowIndicator
        // Full interactive mode — click-to-create, drag, resize.
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
