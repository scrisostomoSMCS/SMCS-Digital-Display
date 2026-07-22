"use client";

import type { ReactNode } from "react";

// Shared building blocks for the manage-page editors (info content + slides),
// so both use the same look and behavior.

export const inputClass =
  "mt-1 min-w-0 max-w-full w-full border-2 border-ink/30 px-3 py-2 text-base focus:border-blue focus:outline-none";
export const labelClass = "block text-base font-semibold";
export const smallBtn =
  "min-h-11 border-2 border-blue px-3 py-1 text-sm font-semibold text-blue hover:bg-blue hover:text-paper lg:min-h-0";

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
        <div key={i} className="flex flex-col gap-2 sm:flex-row lg:flex-row">
          <input
            className={inputClass}
            value={item}
            onChange={(e) =>
              onChange(items.map((x, idx) => (idx === i ? e.target.value : x)))
            }
          />
          <button
            type="button"
            className={`${smallBtn} sm:w-auto lg:w-auto`}
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
