import { supabase } from "./supabase";

/*
  Live bed counts, stored in public.bed_availability (migration 0024). One row
  per displayed count; rows sharing program_key are one program line, e.g. TAY
  has a "Male beds available" row and a "Female beds available" row.

  Anyone can read (the bulletin and home page are anonymous). Staff can update
  only the count column; updated_at/updated_by are stamped by a database
  trigger, so they are never sent from here.
*/
export type BedRow = {
  id: string;
  programKey: string;
  programLabel: string;
  label: string;
  count: number;
  position: number;
  updatedAt: string | null;
};

export type BedCount = { label: string; count: number };
export type BedProgram = {
  key: string;
  label: string;
  counts: Record<string, BedCount>;
  total: number;
};

// Code-edited, not staff-editable: these change rarely, and only the counts
// are the live part.
export const BED_RESERVE_PHONE = "(209) 636-0651";
export const FAMILY_LODGE_INTAKE_PHONE = "209-939-9733";

type BedDbRow = {
  id: string;
  program_key: string;
  program_label: string;
  label: string;
  count: number;
  position: number;
  updated_at: string | null;
};

const toBedRow = (r: BedDbRow): BedRow => ({
  id: r.id,
  programKey: r.program_key,
  programLabel: r.program_label,
  label: r.label,
  count: r.count,
  position: r.position,
  updatedAt: r.updated_at,
});

/*
  All rows in display order, or null when the read failed. null is not the same
  as "no rows": callers keep the last good numbers on screen on null rather than
  blanking the display.
*/
export async function fetchBedRows(): Promise<BedRow[] | null> {
  const { data, error } = await supabase
    .from("bed_availability")
    .select("id, program_key, program_label, label, count, position, updated_at")
    .order("position");
  if (error || !data) return null;
  return (data as BedDbRow[]).map(toBedRow);
}

// Rows (already in position order) grouped into one entry per program.
export function groupBedPrograms(rows: BedRow[]): BedProgram[] {
  const programs: BedProgram[] = [];
  const byKey = new Map<string, BedProgram>();
  for (const r of rows) {
    let p = byKey.get(r.programKey);
    if (!p) {
      p = { key: r.programKey, label: r.programLabel, counts: {}, total: 0 };
      byKey.set(r.programKey, p);
      programs.push(p);
    }
    p.counts[r.id] = { label: r.label, count: r.count };
    p.total += r.count;
  }
  return programs;
}

// Newest updated_at across the rows: the "as of" time for the whole list.
export function latestBedUpdate(rows: BedRow[]): string | null {
  let latest: string | null = null;
  for (const r of rows) {
    if (r.updatedAt && (!latest || Date.parse(r.updatedAt) > Date.parse(latest))) {
      latest = r.updatedAt;
    }
  }
  return latest;
}

/*
  Writes the count of EVERY row passed, changed or not. That is deliberate: the
  trigger restamps each row written, which is how an unchanged "Update" still
  moves the public "as of" date forward.

  `.select("id")` because RLS makes a forbidden update a silent no-op (zero
  rows, no error); an empty result is reported as a failure instead of a
  false "Saved".
*/
export async function saveBedCounts(
  counts: { id: string; count: number }[],
): Promise<string | null> {
  const results = await Promise.all(
    counts.map(({ id, count }) =>
      supabase.from("bed_availability").update({ count }).eq("id", id).select("id"),
    ),
  );
  for (const { data, error } of results) {
    if (error) return error.message;
    if (!data || data.length === 0) {
      return "You don't have permission to change bed counts.";
    }
  }
  return null;
}

/*
  The labels are verbose ("Male beds available", "Double Rooms Available").
  The compact bulletin panel's header already says "Bed Availability," so drop
  the redundant "beds/rooms available" tail and keep only the qualifier
  ("Male", "Double"). A plain "Available" collapses to nothing, leaving just
  the number.
*/
export const shortBedLabel = (label: string) =>
  label.replace(/\s*(beds?|rooms?)?\s*available$/i, "").trim();

// "September 25, 2026" (long) or "Sep 25, 2026" (medium) in the viewer's time
// zone. updated_at is a real instant, unlike the calendar's UTC wall clock.
export function formatBedDate(
  iso: string | null,
  locale: string,
  style: "long" | "medium",
): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: style }).format(t);
}
