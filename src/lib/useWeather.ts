"use client";

import { useSyncExternalStore } from "react";
import { parseForecast, type Forecast } from "./weather";

/*
  Stockton's forecast for the Weather slide, from /api/weather. Shared by every
  surface that draws the slide (the bulletin and the manage-page previews), so
  they all show the same thing and fail the same way.

  Same shape as useBedAvailability: ONE poller per browser tab however many
  components subscribe, started by the first and stopped by the last. There is
  no Realtime here — a forecast is not a table — so it is just a poll, matched
  to the route's 30-minute cache.

  LAST KNOWN GOOD. A failed or malformed fetch never replaces a good forecast.
  The last good one is also copied to localStorage, so a TV that reloads (the
  crash boundary does that) while the API is down still has a forecast to show.
  Storage can be unavailable (private mode, blocked site data); every access
  is guarded and the store simply works from memory then.

  Returns null until a forecast is known. Callers drop past days with
  upcomingDays(), so a stale copy never presents yesterday as today.
*/
const REFRESH_INTERVAL = 1_800_000; // 30 minutes, matching /api/weather
const STORAGE_KEY = "smcs:weather:v1";

function readStored(): Forecast | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseForecast(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function store(f: Forecast) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
  } catch {
    // Storage blocked or full; memory still holds it.
  }
}

let snapshot: Forecast | null = null;
let restored = false;
const listeners = new Set<() => void>();
let poll: ReturnType<typeof setInterval> | null = null;

const notify = () => listeners.forEach((fn) => fn());

async function load() {
  try {
    const res = await fetch("/api/weather");
    if (!res.ok) return; // keep showing last known data
    const next = parseForecast(await res.json());
    if (!next) return;
    snapshot = next;
    store(next);
    notify();
  } catch {
    // Network down: keep showing last known data.
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (!restored) {
    restored = true;
    const saved = readStored();
    if (saved && !snapshot) {
      snapshot = saved;
      queueMicrotask(notify);
    }
  }
  if (!poll) {
    load();
    poll = setInterval(load, REFRESH_INTERVAL);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && poll) {
      clearInterval(poll);
      poll = null;
    }
  };
}

// Never subscribes, for components that only sometimes need the forecast.
const subscribeNever = () => () => {};

/*
  `enabled` false skips the poll entirely, so a bulletin with no Weather slide
  never calls the API. The hook is still called unconditionally (rules of
  hooks); only which subscribe function it uses changes.
*/
export function useWeather(enabled = true): Forecast | null {
  return useSyncExternalStore(
    enabled ? subscribe : subscribeNever,
    () => (enabled ? snapshot : null),
    () => null,
  );
}
