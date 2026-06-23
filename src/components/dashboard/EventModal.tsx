"use client";

import { useEffect } from "react";

// Plain, serializable shape captured from a clicked calendar event.
export type SelectedEvent = {
  name: string;
  description?: string;
  location?: string;
  start: Date | null;
  end: Date | null;
  allDay: boolean;
};

// "Tuesday, June 23 · 9:00 AM – 10:30 AM"
function formatWhen(e: SelectedEvent): string {
  if (!e.start) return "";
  const dateFmt = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  if (e.allDay) return `${dateFmt.format(e.start)} · All day`;

  const timeFmt = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const start = timeFmt.format(e.start);
  const end = e.end ? ` – ${timeFmt.format(e.end)}` : "";
  return `${dateFmt.format(e.start)} · ${start}${end}`;
}

type EventModalProps = {
  event: SelectedEvent | null;
  onClose: () => void;
};

/*
  Detail popup shown when an event is clicked. View-only: it just displays the
  event's details. Dismisses via the close button, the backdrop, or Escape.
*/
export default function EventModal({ event, onClose }: EventModalProps) {
  useEffect(() => {
    if (!event) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [event, onClose]);

  if (!event) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={event.name}
    >
      {/* Stop propagation so clicks inside the panel don't dismiss it. */}
      <div
        className="w-full max-w-lg border-4 border-blue bg-paper p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold text-blue md:text-3xl">
            {event.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 border-2 border-blue px-3 py-1 text-lg font-bold text-blue hover:bg-blue hover:text-paper"
          >
            ✕
          </button>
        </div>

        <span className="mt-3 block h-1 w-20 bg-teal" />

        <p className="mt-4 text-lg font-semibold">{formatWhen(event)}</p>
        {event.location && (
          <p className="mt-1 text-lg">
            <span className="font-semibold text-blue">Location:</span>{" "}
            {event.location}
          </p>
        )}

        <p className="mt-4 text-lg leading-relaxed">
          {event.description || "No additional details for this event."}
        </p>
      </div>
    </div>
  );
}
