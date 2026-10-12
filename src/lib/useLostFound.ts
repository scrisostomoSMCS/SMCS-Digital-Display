"use client";

import { useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { fetchLostFoundItems, type LostFoundItem } from "./lostFound";

/*
  Live lost & found items, shared by every component in the tab that needs
  them (the bulletin rotation, the slide renderer, the manage editor). Same
  mechanism as useBedAvailability: one Realtime subscription plus a slow
  backstop poll, opened by the first subscriber and closed by the last, and a
  failed read keeps the items already loaded.

  Callers pass `enabled` (SHOW_LOST_FOUND, and whether a lost & found slide is
  in play); when false nothing is fetched or subscribed.
*/
const REFRESH_INTERVAL = 600_000; // 10 minutes, matching InformationDisplay

let snapshot: LostFoundItem[] | null = null;
const listeners = new Set<() => void>();
let channel: RealtimeChannel | null = null;
let poll: ReturnType<typeof setInterval> | null = null;

async function load() {
  const next = await fetchLostFoundItems();
  if (!next) return; // keep showing last known data
  snapshot = next;
  listeners.forEach((fn) => fn());
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (!channel) {
    load();
    channel = supabase
      .channel("lost-found")
      .on("postgres_changes", { event: "*", schema: "public", table: "lost_found_items" }, load)
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

const subscribeNever = () => () => {};

export function useLostFound(enabled: boolean): LostFoundItem[] | null {
  return useSyncExternalStore(
    enabled ? subscribe : subscribeNever,
    () => (enabled ? snapshot : null),
    () => null,
  );
}

// Re-read now, e.g. right after staff add or remove an item, without waiting
// for the Realtime echo.
export const reloadLostFound = () => load();
