"use client";

import type { ReactNode } from "react";

// Shared building blocks for the manage-page editors (info content + slides),
// so both use the same look and behavior.

export const inputClass =
  "mt-1 w-full border-2 border-ink/30 px-3 py-2 text-base focus:border-blue focus:outline-none";
export const labelClass = "block text-base font-semibold";
export const smallBtn =
  "border-2 border-blue px-3 py-1 text-sm font-semibold text-blue hover:bg-blue hover:text-paper";

export function Field({
  label,
  value,
  onChange,
  hint,
  textarea,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  textarea?: boolean;
  rows?: number;
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
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
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
    <section id={id} className="scroll-mt-8 border-2 border-placeholder p-6">
      <div className="flex items-start justify-between gap-4">
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
  open,
  onToggle,
  children,
}: {
  id?: string;
  title: string;
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
        className="flex w-full items-center gap-3 bg-ink/5 px-5 py-3 text-left"
      >
        <span aria-hidden="true" className="text-lg text-ink/50">
          {open ? "▾" : "▸"}
        </span>
        <span className="truncate text-xl font-bold text-blue">{title}</span>
      </button>
      {open && <div className="space-y-5 p-5">{children}</div>}
    </section>
  );
}

// Editor for a simple list of strings (add / edit / remove).
export function StringListEditor({
  items,
  onChange,
  addLabel = "+ Add item",
}: {
  items: string[];
  onChange: (next: string[]) => void;
  addLabel?: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input
            className={inputClass}
            value={item}
            onChange={(e) =>
              onChange(items.map((x, idx) => (idx === i ? e.target.value : x)))
            }
          />
          <button
            type="button"
            className={smallBtn}
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className={smallBtn}
        onClick={() => onChange([...items, ""])}
      >
        {addLabel}
      </button>
    </div>
  );
}
