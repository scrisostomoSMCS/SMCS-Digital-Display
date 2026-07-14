"use client";

import { useEffect, useState } from "react";
import ColorPicker from "./ColorPicker";

/*
  Create/edit form shown when an employee clicks a slot or an event. Pure UI:
  it collects fields and hands them back; the parent (ManageCalendar) does the
  Supabase write. Times are datetime-local strings treated as UTC wall-clock.
*/
export type EventFormState = {
  name: string;
  description: string;
  location: string;
  startLocal: string; // "YYYY-MM-DDTHH:mm" (UTC wall-clock)
  endLocal: string;
  showOnDashboard: boolean;
  color: string; // hex tint used on the calendars
};

type EventFormProps = {
  mode: "create" | "edit";
  initial: EventFormState;
  saving: boolean;
  error: string | null;
  onSave: (state: EventFormState) => void;
  onDelete?: () => void;
  onClose: () => void;
};

const inputClass =
  "mt-1 w-full border-2 border-ink/30 px-3 py-2 text-base focus:border-blue focus:outline-none";

export default function EventForm({
  mode,
  initial,
  saving,
  error,
  onSave,
  onDelete,
  onClose,
}: EventFormProps) {
  const [state, setState] = useState<EventFormState>(initial);

  // Re-sync when a different event/slot is opened.
  useEffect(() => setState(initial), [initial]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof EventFormState>(k: K, v: EventFormState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const invalid =
    !state.name.trim() ||
    !state.startLocal ||
    !state.endLocal ||
    state.endLocal <= state.startLocal;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={mode === "create" ? "New event" : "Edit event"}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!invalid) onSave(state);
        }}
        className="w-full max-w-lg border-4 border-blue bg-paper p-6"
      >
        <h2 className="text-2xl font-bold text-blue">
          {mode === "create" ? "New event" : "Edit event"}
        </h2>
        <span className="mt-2 block h-1 w-16 bg-teal" />

        <label className="mt-4 block text-base font-semibold">
          Name
          <input
            className={inputClass}
            value={state.name}
            onChange={(e) => set("name", e.target.value)}
            autoFocus
            required
          />
        </label>

        <label className="mt-3 block text-base font-semibold">
          Location
          <input
            className={inputClass}
            value={state.location}
            onChange={(e) => set("location", e.target.value)}
          />
        </label>

        <label className="mt-3 block text-base font-semibold">
          Description
          <textarea
            className={inputClass}
            rows={2}
            value={state.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-base font-semibold">
            Start
            <input
              type="datetime-local"
              className={inputClass}
              value={state.startLocal}
              onChange={(e) => set("startLocal", e.target.value)}
              required
            />
          </label>
          <label className="block text-base font-semibold">
            End
            <input
              type="datetime-local"
              className={inputClass}
              value={state.endLocal}
              onChange={(e) => set("endLocal", e.target.value)}
              required
            />
          </label>
        </div>

        <div className="mt-4">
          <ColorPicker
            value={state.color}
            onChange={(v) => set("color", v)}
          />
        </div>

        <label className="mt-4 flex items-center gap-2 text-base font-semibold">
          <input
            type="checkbox"
            className="h-5 w-5 accent-blue"
            checked={state.showOnDashboard}
            onChange={(e) => set("showOnDashboard", e.target.checked)}
          />
          Show on Live Calendar
        </label>

        {error && (
          <p role="alert" className="mt-3 border-l-4 border-blue pl-3 text-base">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || invalid}
              className="border-2 border-blue bg-blue px-5 py-2 text-base font-semibold text-paper hover:bg-paper hover:text-blue disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border-2 border-ink/30 px-5 py-2 text-base font-semibold hover:border-ink"
            >
              Cancel
            </button>
          </div>
          {mode === "edit" && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="border-2 border-teal px-5 py-2 text-base font-semibold text-teal hover:bg-teal hover:text-paper disabled:opacity-60"
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
