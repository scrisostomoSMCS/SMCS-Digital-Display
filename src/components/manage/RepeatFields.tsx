"use client";

import { Repeat } from "lucide-react";
import {
  DAY_SHORT,
  formatDateKey,
  weekdayOf,
  type RepeatState,
} from "@/lib/recurrence";

/*
  The "Repeats weekly" fields, shared by Quick add and the calendar's event
  form so both behave identically: a "Repeats weekly" checkbox with Sun–Sat day
  toggles (the event's own start day is pre-selected when it's ticked), a
  "Daily" checkbox under it (all seven days, no toggles), and an optional
  "Ends on" date. Pure UI; validation lives in src/lib/recurrence (repeatError)
  and the parent passes its message in, since the parent also needs it to
  disable Save.

  When editing an existing series the parent can also pass its skipped dates,
  listed here with an Undo button each.
*/

const DAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type RepeatFieldsProps = {
  value: RepeatState;
  onChange: (next: RepeatState) => void;
  // The event's start date ("YYYY-MM-DD…"), used to pre-select its weekday.
  startDate: string;
  error: string | null;
  inputClass: string;
  skipped?: string[];
  onUndoSkip?: (date: string) => void;
  busy?: boolean;
};

export default function RepeatFields({
  value,
  onChange,
  startDate,
  error,
  inputClass,
  skipped = [],
  onUndoSkip,
  busy = false,
}: RepeatFieldsProps) {
  // "Daily" is stored as all seven days; "Repeats weekly" is any other set.
  // The two boxes are either/or: ticking one unticks the other.
  const daily = value.on && value.days.length === 7;
  const weekly = value.on && !daily;

  function toggleWeekly(on: boolean) {
    if (!on) return onChange({ ...value, on: false });
    const day = weekdayOf(startDate);
    const keep = value.days.length > 0 && value.days.length < 7;
    onChange({
      on: true,
      days: keep ? value.days : day === null ? [] : [day],
      until: value.until,
    });
  }

  function toggleDaily(on: boolean) {
    if (!on) return onChange({ ...value, on: false });
    onChange({ on: true, days: [0, 1, 2, 3, 4, 5, 6], until: value.until });
  }

  function toggleDay(d: number) {
    const days = value.days.includes(d)
      ? value.days.filter((x) => x !== d)
      : [...value.days, d].sort((a, b) => a - b);
    onChange({ ...value, days });
  }

  return (
    <fieldset className="border-2 border-ink/20 p-3">
      <legend className="sr-only">Repeat</legend>
      <label className="flex items-center gap-3 text-base font-semibold">
        <input
          type="checkbox"
          className="h-5 w-5 accent-blue"
          checked={weekly}
          onChange={(e) => toggleWeekly(e.target.checked)}
        />
        <Repeat size={20} aria-hidden="true" className="text-blue" />
        Repeats weekly
      </label>
      <label className="mt-2 flex items-center gap-3 text-base font-semibold">
        <input
          type="checkbox"
          className="h-5 w-5 accent-blue"
          checked={daily}
          onChange={(e) => toggleDaily(e.target.checked)}
        />
        <Repeat size={20} aria-hidden="true" className="text-blue" />
        Daily
      </label>

      {value.on && (
        <div className="mt-3 space-y-3">
          {weekly && (
            <div>
              <p id="repeat-days-label" className="text-base font-semibold">
                On these days
              </p>
              <div
                role="group"
                aria-labelledby="repeat-days-label"
                className="mt-1 flex flex-wrap gap-2"
              >
                {DAY_SHORT.map((label, d) => {
                  const on = value.days.includes(d);
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={on}
                      aria-label={DAY_LONG[d]}
                      onClick={() => toggleDay(d)}
                      className={`min-h-11 min-w-14 border-2 px-3 py-1 text-base font-semibold ${
                        on
                          ? "border-blue bg-blue text-paper"
                          : "border-ink/30 bg-paper text-ink hover:border-blue"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <label className="block text-base font-semibold">
            Ends on <span className="font-normal text-ink/70">(optional)</span>
            <input
              type="date"
              className={inputClass}
              value={value.until}
              min={startDate.slice(0, 10) || undefined}
              onChange={(e) => onChange({ ...value, until: e.target.value })}
            />
            <span className="mt-1 block text-sm font-normal text-ink/70">
              Leave blank to repeat with no end date.
            </span>
          </label>

          {skipped.length > 0 && onUndoSkip && (
            <div>
              <p className="text-base font-semibold">Skipped dates</p>
              <ul className="mt-1 space-y-2">
                {skipped.map((date) => (
                  <li key={date} className="flex items-center gap-3 text-base">
                    <span>{formatDateKey(date)}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onUndoSkip(date)}
                      className="min-h-11 border-2 border-blue px-3 py-1 text-sm font-semibold text-blue hover:bg-blue hover:text-paper disabled:opacity-60 lg:min-h-0"
                    >
                      Undo
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 border-l-4 border-blue pl-3 text-base font-semibold">
          {error}
        </p>
      )}
    </fieldset>
  );
}
