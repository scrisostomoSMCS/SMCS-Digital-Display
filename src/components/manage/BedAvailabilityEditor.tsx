"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  fetchBedRows,
  groupBedPrograms,
  latestBedUpdate,
  saveBedCounts,
  type BedRow,
} from "@/lib/bedAvailability";
import UpdatedAt from "./UpdatedAt";

/*
  Staff editor for the live bed counts shown on the bulletin's red panel and
  the home-page popup. One number input per count row (public.bed_availability,
  migration 0024); program names and labels are fixed by the migration.

  "Update" writes EVERY row, changed or not, and stays enabled with no edits:
  the database restamps each row it writes, so pressing it after checking the
  counts moves the public "as of" date to today even when no number changed.
*/

// Whole numbers only, 0 or more. The database's check constraint enforces the
// same rule; this just catches it before the round trip.
const isValidCount = (v: string) => /^\d{1,5}$/.test(v.trim());

type Drafts = Record<string, string>;
const draftsFrom = (rows: BedRow[]): Drafts =>
  Object.fromEntries(rows.map((r) => [r.id, String(r.count)]));

export default function BedAvailabilityEditor() {
  const [rows, setRows] = useState<BedRow[] | null>(null);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    rows !== null && rows.some((r) => drafts[r.id] !== String(r.count));
  const allValid = rows !== null && rows.every((r) => isValidCount(drafts[r.id] ?? ""));

  const load = useCallback(async () => {
    const next = await fetchBedRows();
    if (!next) {
      setLoadFailed(true);
      return;
    }
    setLoadFailed(false);
    setRows(next);
    setDrafts(draftsFrom(next));
  }, []);

  // Realtime keeps the form current with another staff member's update, but
  // only while there are no unsaved edits here, so it never clobbers someone
  // mid-typing. The ref avoids re-subscribing on every keystroke.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    load();
    const channel = supabase
      .channel("bed-availability-editor")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bed_availability" },
        () => {
          if (!dirtyRef.current) load();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  async function handleUpdate() {
    if (!rows || !allValid) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await saveBedCounts(
      rows.map((r) => ({ id: r.id, count: Number(drafts[r.id].trim()) })),
    );
    setSaving(false);
    if (result) {
      setError(result);
      return;
    }
    // Reload for the new timestamps rather than waiting on realtime.
    await load();
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  }

  if (!rows) {
    return (
      <p className="text-lg text-ink/70">
        {loadFailed
          ? "Couldn’t load the bed counts. Refresh the page to try again."
          : "Loading bed counts…"}
      </p>
    );
  }

  const programs = groupBedPrograms(rows);

  return (
    <div className="space-y-4">
      <p className="text-lg">
        <UpdatedAt at={latestBedUpdate(rows)} className="text-lg" />
      </p>

      {/* Compact so every location fits on one laptop screen. auto-fill rather
          than breakpoints because the column's width depends on whether the
          sidebar is showing: 4 across at ~1440px, fewer as it narrows. The
          13.25rem minimum keeps a two-count card (TAY, Pathways) wide enough
          for both inputs side by side. */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(13.25rem,1fr))] gap-2">
        {programs.map((p) => (
          <fieldset key={p.key} className="border-2 border-placeholder px-2.5 pt-1 pb-3">
            <legend className="px-1 text-base leading-snug font-bold text-blue">
              {p.label}
            </legend>
            <div
              className={
                Object.keys(p.counts).length > 1 ? "grid grid-cols-2 gap-2" : ""
              }
            >
              {Object.entries(p.counts).map(([id, c]) => {
                const value = drafts[id] ?? "";
                const invalid = !isValidCount(value);
                return (
                  // justify-end: a label that wraps to two lines pushes its
                  // input down, so both inputs in a card stay level.
                  <label key={id} className="flex flex-col justify-end">
                    <span className="block text-sm leading-tight font-semibold">
                      {c.label}
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={value}
                      aria-invalid={invalid}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [id]: e.target.value }))
                      }
                      // Block the characters a number input otherwise accepts
                      // but a bed count can never contain.
                      onKeyDown={(e) => {
                        if (["-", "+", "e", "E", ".", ","].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      className={`mt-1 h-10 w-[5.5rem] border-2 px-2 text-base font-semibold tabular-nums focus:border-blue focus:outline-none ${
                        invalid ? "border-blue" : "border-ink/30"
                      }`}
                    />
                    {invalid && (
                      <span className="mt-1 block text-sm font-semibold text-blue">
                        Enter a whole number, 0 or more
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="flex flex-col items-start gap-3 border-t-2 border-blue/20 pt-4 lg:flex-row lg:items-center">
        <button
          type="button"
          onClick={handleUpdate}
          disabled={saving || !allValid}
          className="rounded-full border-2 border-blue bg-blue px-7 py-3 text-lg font-semibold text-paper hover:bg-paper hover:text-blue disabled:opacity-60 disabled:hover:bg-blue disabled:hover:text-paper"
        >
          {saving ? "Updating…" : "Update"}
        </button>
        {dirty && !saving && (
          <span className="text-lg font-semibold text-ink/70">Unsaved changes</span>
        )}
        {!dirty && !saved && !error && (
          <span className="text-lg text-ink/50">No unsaved changes</span>
        )}
        {saved && (
          <span role="status" className="text-lg font-semibold text-blue">
            ✓ Updated. The screens show these counts.
          </span>
        )}
        {error && (
          <span role="alert" className="text-lg font-semibold text-blue">
            Couldn’t update: {error}
          </span>
        )}
      </div>
    </div>
  );
}
