"use client";

import { useEffect, useState } from "react";

export type BedCount = { label: string; count: number };
export type BedProgram = {
  key: string;
  label: string;
  counts: Record<string, BedCount>;
  total: number;
};
export type BedData = {
  ok: boolean;
  programs?: BedProgram[];
  reserve_phone?: string;
  updated_at_display?: string;
};

/*
  Live bed counts from WordPress via /api/beds. Shared by every surface that
  shows them (the bulletin panel and the home-page popup) so they poll and
  fail the same way.

  Returns null until the first successful load; a failed poll keeps the last
  good numbers on screen rather than blanking the display.
*/
export function useBedAvailability(): BedData | null {
  const [data, setData] = useState<BedData | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/beds");
        const json: BedData = await res.json();
        if (!cancelled && json.ok) setData(json);
      } catch {
        /* keep showing last known data */
      }
    };

    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return data;
}

/*
  The API labels are verbose ("Male beds available", "Double Rooms Available").
  Every panel header already says "Bed Availability," so drop the redundant
  "beds/rooms available" tail and keep only the qualifier ("Male", "Double").
  A plain "Available" collapses to nothing, leaving just the number.
*/
export const shortBedLabel = (label: string) =>
  label.replace(/\s*(beds?|rooms?)?\s*available$/i, "").trim();
