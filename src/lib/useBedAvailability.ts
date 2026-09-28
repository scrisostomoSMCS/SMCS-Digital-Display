"use client";

import { useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import {
  fetchBedRows,
  groupBedPrograms,
  latestBedUpdate,
  type BedProgram,
} from "./bedAvailability";

export type BedData = {
  programs: BedProgram[];
  // Newest row's updated_at: the "as of" date. null if never stamped.
  updatedAt: string | null;
};

/*
  Live bed counts from Supabase (public.bed_availability). Shared by every
  surface that shows them (the bulletin panel, the manage-page previews, and
  the home-page popup) so they update and fail the same way.

  Same mechanism as the rest of the bulletin: a Realtime subscription for
  instant updates, plus a slow backstop poll that re-runs the same loader.

  ONE subscription per browser tab, shared by every mounted panel. The manage
  page draws a bed panel in each slide preview, which can be dozens; a channel
  and timer each would be wasteful. The first subscriber opens it, the last one
  to unmount closes it (same idea as UpdatedAt's shared ticker).

  Returns null until the first successful load. A failed load keeps the last
  good numbers rather than blanking the display, and an empty table (migration
  not run yet) is treated the same as a failure.
*/
const REFRESH_INTERVAL = 600_000; // 10 minutes, matching InformationDisplay

let snapshot: BedData | null = null;
const listeners = new Set<() => void>();
let channel: RealtimeChannel | null = null;
let poll: ReturnType<typeof setInterval> | null = null;

async function load() {
  const rows = await fetchBedRows();
  if (!rows || rows.length === 0) return; // keep showing last known data
  snapshot = { programs: groupBedPrograms(rows), updatedAt: latestBedUpdate(rows) };
  listeners.forEach((fn) => fn());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (!channel) {
    load();
    channel = supabase
      .channel("bed-availability")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bed_availability" },
        load,
      )
      .subscribe();
    poll = setInterval(load, REFRESH_INTERVAL);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && channel) {
      supabase.removeChannel(channel);
      channel = null;
      if (poll) clearInterval(poll);
      poll = null;
    }
  };
}

export function useBedAvailability(): BedData | null {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => null,
  );
}
