"use client";

import { useState } from "react";
import { createEvent } from "@/lib/manageEvents";
import { DEFAULT_EVENT_COLOR } from "@/lib/eventColors";
import { Field, inputClass, labelClass } from "./editorFields";
import ColorPicker from "./ColorPicker";

/*
  A second entry point for adding a calendar event, alongside the calendar
  itself. It writes to the SAME Supabase events (via the shared createEvent),
  so an event added here shows on the calendar, the Live Calendar, and the
  "Events happening today" slide, not a separate list. Times follow the app's
  UTC wall-clock convention (what you enter is what displays).
*/
export default function QuickEventForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [onDashboard, setOnDashboard] = useState(true);
  const [color, setColor] = useState(DEFAULT_EVENT_COLOR);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invalid = !name.trim() || !date || !start || !end || end <= start;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid) {
      setError("Add a name, date, and start/end times (end after start).");
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    const err = await createEvent({
      name: name.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      // Interpreted as UTC wall-clock, matching the calendar + display.
      start: new Date(`${date}T${start}:00Z`).toISOString(),
      end: new Date(`${date}T${end}:00Z`).toISOString(),
      showOnDashboard: onDashboard,
      color,
    });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setName("");
    setDescription("");
    setLocation("");
    setStart("");
    setEnd("");
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Event name" value={name} onChange={setName} />
        <Field label="Location" value={location} onChange={setLocation} />
      </div>
      <Field
        label="Description"
        value={description}
        onChange={setDescription}
        textarea
        rows={2}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <label className="block">
          <span className={labelClass}>Date</span>
          <input
            type="date"
            className={inputClass}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Start time</span>
          <input
            type="time"
            className={inputClass}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label className="block">
          <span className={labelClass}>End time</span>
          <input
            type="time"
            className={inputClass}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
      </div>

      <ColorPicker value={color} onChange={setColor} />

      <label className="flex items-center gap-3 text-base font-semibold">
        <input
          type="checkbox"
          className="h-5 w-5 accent-blue"
          checked={onDashboard}
          onChange={(e) => setOnDashboard(e.target.checked)}
        />
        Show on the Live Calendar and &ldquo;Events happening today&rdquo;
      </label>

      {error && (
        <p role="alert" className="text-base font-semibold text-blue">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving || invalid}
          className="border-2 border-blue bg-blue px-6 py-2 text-base font-semibold text-paper hover:bg-paper hover:text-blue disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add event"}
        </button>
        {saved && <span className="text-base font-semibold text-blue">✓ Added</span>}
      </div>
    </form>
  );
}
