"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  DatesSetArg,
  DateSelectArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import { Repeat } from "lucide-react";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { supabase } from "@/lib/supabase";
import {
  fetchAllEvents,
  createEvent,
  updateEvent,
  moveEvent,
  deleteEvent,
  setSkippedDates,
  type ManageEvent,
} from "@/lib/manageEvents";
import {
  expandEvents,
  recurrenceToSave,
  repeatStateFrom,
  repeatsLabel,
  REPEAT_OFF,
} from "@/lib/recurrence";
import EventForm, { type EventFormState } from "./EventForm";
import { DEFAULT_EVENT_COLOR } from "@/lib/eventColors";

/*
  Interactive, Google-Calendar-style editor for employees/admins. SEPARATE from
  the view-only Live Calendar component on purpose: editing controls must never
  appear on the public/TV display. All writes go to the one Supabase `events`
  table; the dashboard and app pick up changes through their existing realtime
  subscriptions. Desktop keeps the full week; smaller screens use a day view.

  Weekly series (0035) are expanded for the visible range. Their occurrences
  can't be dragged or resized (that would move one date's time onto the whole
  series); clicking one opens the series itself, with "Skip … only" for the
  date that was clicked.
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
  skipDate?: string; // series only: the occurrence that was clicked
};

// Same markup as FullCalendar's default time-grid event (so one-time events
// look exactly as before), plus a "Repeats Mon, Wed" line on a series.
function renderManageEvent(arg: EventContentArg) {
  const repeat = arg.event.extendedProps.repeatLabel as string | undefined;
  return (
    <div className="fc-event-main-frame">
      {arg.timeText && <div className="fc-event-time">{arg.timeText}</div>}
      <div className="fc-event-title-container">
        <div className="fc-event-title fc-sticky">
          {arg.event.title || "\u00A0"}
        </div>
        {repeat && (
          <div className="flex items-center gap-1 text-xs font-semibold">
            <Repeat size={12} aria-hidden="true" />
            {repeat}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ManageCalendar() {
  const calendarRef = useRef<FullCalendar>(null);
  const [mounted, setMounted] = useState(false);
  const [compact, setCompact] = useState(false);
  const [events, setEvents] = useState<ManageEvent[]>([]);
  const [form, setForm] = useState<OpenForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The dates FullCalendar is showing, reported by datesSet.
  const [range, setRange] = useState<{ start: Date; end: Date } | null>(null);

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
  // Calendar).
  const fcEvents: EventInput[] = expandEvents(
    events,
    range?.start ?? null,
    range?.end ?? null,
  ).map((e) => ({
    id: e.id,
    title: e.name,
    start: e.start,
    end: e.end,
    backgroundColor: e.color || DEFAULT_EVENT_COLOR,
    borderColor: e.color || DEFAULT_EVENT_COLOR,
    editable: !e.recurrence,
    extendedProps: {
      seriesId: e.seriesId,
      occurrenceDate: e.occurrenceDate,
      repeatLabel: e.recurrence ? repeatsLabel(e.recurrence) : undefined,
      description: e.description,
      location: e.location,
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
        color: DEFAULT_EVENT_COLOR,
        repeat: REPEAT_OFF,
      },
    });
    sel.view.calendar.unselect();
  }

  // Click an event → edit. A series occurrence opens the SERIES row, so the
  // form shows its real first date; saving from a later date never moves it.
  function handleEventClick(click: EventClickArg) {
    setError(null);
    const e = click.event;
    const seriesId = e.extendedProps.seriesId as string | undefined;
    const series = seriesId && events.find((x) => x.id === seriesId);
    if (series) {
      setForm({
        mode: "edit",
        id: series.id,
        skipDate: e.extendedProps.occurrenceDate as string | undefined,
        initial: {
          name: series.name,
          description: series.description ?? "",
          location: series.location ?? "",
          startLocal: dateToLocal(new Date(series.start)),
          endLocal: series.end ? dateToLocal(new Date(series.end)) : "",
          color: series.color || DEFAULT_EVENT_COLOR,
          repeat: repeatStateFrom(series.recurrence),
        },
      });
      return;
    }
    setForm({
      mode: "edit",
      id: e.id,
      initial: {
        name: e.title,
        description: (e.extendedProps.description as string) ?? "",
        location: (e.extendedProps.location as string) ?? "",
        startLocal: e.start ? dateToLocal(e.start) : "",
        endLocal: e.end ? dateToLocal(e.end) : "",
        color: (e.extendedProps.color as string) ?? DEFAULT_EVENT_COLOR,
        repeat: REPEAT_OFF,
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
      color: s.color,
      recurrence: recurrenceToSave(s.repeat),
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

  // "Skip Tue, Nov 25 only": hide one date of the series, then close.
  async function handleSkip(date: string) {
    if (!form?.id) return;
    setSaving(true);
    setError(null);
    const err = await setSkippedDates(form.id, { add: date });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setForm(null);
    load();
  }

  // Undo a skip from the form's "Skipped dates" list. The form stays open
  // (and keeps any unsaved edits); the list refreshes from the reload.
  async function handleUndoSkip(date: string) {
    if (!form?.id) return;
    setSaving(true);
    setError(null);
    const err = await setSkippedDates(form.id, { remove: date });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    load();
  }

  const openSeries = form?.id ? events.find((x) => x.id === form.id) : undefined;

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
        eventContent={renderManageEvent}
        datesSet={(arg: DatesSetArg) => setRange({ start: arg.start, end: arg.end })}
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
          skipDate={form.skipDate}
          skipped={openSeries?.recurrence?.exceptions}
          onSkip={handleSkip}
          onUndoSkip={handleUndoSkip}
        />
      )}
    </div>
  );
}
