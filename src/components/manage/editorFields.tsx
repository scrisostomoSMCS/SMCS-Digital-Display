"use client";

import { useState, type ReactNode } from "react";

// Shared building blocks for the manage-page editors (info content + slides),
// so both use the same look and behavior.

export const inputClass =
  "mt-1 min-w-0 max-w-full w-full border-2 border-ink/30 px-3 py-2 text-base focus:border-blue focus:outline-none";
export const labelClass = "block text-base font-semibold";
export const smallBtn =
  "min-h-11 border-2 border-blue px-3 py-1 text-sm font-semibold text-blue hover:bg-blue hover:text-paper lg:min-h-0";

/*
  Live "142/160" readout for a length-limited field. Turns blue at 90% so the
  ceiling is visible before it is hit; the input itself refuses more characters,
  so this is information, not an error state. aria-live announces the count as
  it changes for anyone not watching the number.
*/
export function CharCount({ value, max }: { value: string; max: number }) {
  const used = value.length;
  const close = used >= max * 0.9;
  return (
    <span
      aria-live="polite"
      className={`mt-1 block text-right text-sm tabular-nums ${
        close ? "font-semibold text-blue" : "text-ink/60"
      }`}
    >
      {used}/{max}
      {used >= max && <span className="ml-2">Limit reached</span>}
    </span>
  );
}

export function Field({
  label,
  value,
  onChange,
  hint,
  textarea,
  rows = 2,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  textarea?: boolean;
  rows?: number;
  // Sized so the text cannot be cut off on the wall display, see
  // lib/bulletinLimits. Omit for fields that are not shown on the bulletin.
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {hint && <span className="block text-sm text-ink/60">{hint}</span>}
      {textarea ? (
        <textarea
          className={inputClass}
          rows={rows}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={inputClass}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {maxLength !== undefined && <CharCount value={value} max={maxLength} />}
    </label>
  );
}

/*
  An English field paired with its Spanish counterpart, which stays collapsed
  behind an "Edit Spanish manually" expander until staff open it. Spanish is
  filled in automatically on save (see translateInfoContent.server.ts); this
  is only for hand-correcting it, so it's hidden in the normal typing flow.
*/
export function BilingualField({
  label,
  value,
  onChange,
  valueEs,
  onChangeEs,
  hint,
  textarea,
  rows = 2,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  valueEs: string;
  onChangeEs: (v: string) => void;
  hint?: string;
  textarea?: boolean;
  rows?: number;
  maxLength?: number;
}) {
  const [showEs, setShowEs] = useState(false);
  return (
    <div>
      <Field
        label={label}
        value={value}
        onChange={onChange}
        hint={hint}
        textarea={textarea}
        rows={rows}
        maxLength={maxLength}
      />
      <button
        type="button"
        onClick={() => setShowEs((s) => !s)}
        aria-expanded={showEs}
        className="mt-1.5 text-sm font-semibold text-blue hover:underline"
      >
        {showEs ? "▾" : "▸"} Edit Spanish manually
      </button>
      {showEs && (
        <div className="mt-2">
          <Field
            label={`${label} (Español)`}
            value={valueEs}
            onChange={onChangeEs}
            textarea={textarea}
            rows={rows}
            maxLength={maxLength}
          />
        </div>
      )}
    </div>
  );
}

// A titled section that doubles as a sidebar jump target (via id + scroll-mt).
export function Group({
  id,
  title,
  action,
  children,
}: {
  id?: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 border-2 border-placeholder p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 lg:flex-nowrap">
        <h3 className="text-2xl font-bold text-blue">{title}</h3>
        {action}
      </div>
      <span className="mt-2 mb-5 block h-1 w-16 bg-teal" />
      <div className="space-y-5">{children}</div>
    </section>
  );
}

// Collapsible titled panel (controlled). Collapsed keeps the editing area a
// compact list; the header doubles as a sidebar jump target (id).
export function CollapsiblePanel({
  id,
  title,
  badge,
  open,
  onToggle,
  children,
}: {
  id?: string;
  title: string;
  badge?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 border-2 border-placeholder">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-12 w-full flex-wrap items-center gap-x-3 gap-y-2 bg-ink/5 px-4 py-3 text-left lg:px-5"
      >
        <span aria-hidden="true" className="text-lg text-ink/50">
          {open ? "▾" : "▸"}
        </span>
        <span className="truncate text-xl font-bold text-blue">{title}</span>
        {badge}
      </button>
      {open && <div className="space-y-5 p-4 lg:p-5">{children}</div>}
    </section>
  );
}

// Editor for a simple list of strings (add / edit / remove). maxItems/maxLength
// come from the measured ceilings in lib/bulletinLimits: past them the list
// runs off the bulletin canvas.
export function StringListEditor({
  items,
  onChange,
  addLabel = "+ Add item",
  maxItems,
  maxLength,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  addLabel?: string;
  maxItems?: number;
  maxLength?: number;
}) {
  const atLimit = maxItems !== undefined && items.length >= maxItems;
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-2 sm:flex-row lg:flex-row">
          <div className="min-w-0 flex-1">
            <input
              className={inputClass}
              value={item}
              maxLength={maxLength}
              onChange={(e) =>
                onChange(items.map((x, idx) => (idx === i ? e.target.value : x)))
              }
            />
            {maxLength !== undefined && (
              <CharCount value={item} max={maxLength} />
            )}
          </div>
          <button
            type="button"
            className={`${smallBtn} shrink-0 sm:w-auto lg:w-auto`}
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className={`${smallBtn} disabled:cursor-not-allowed disabled:opacity-45`}
        disabled={atLimit}
        onClick={() => onChange([...items, ""])}
      >
        {addLabel}
      </button>
      {atLimit && (
        <p className="text-sm font-semibold text-ink/60">
          Maximum of {maxItems} fits on the display.
        </p>
      )}
    </div>
  );
}
