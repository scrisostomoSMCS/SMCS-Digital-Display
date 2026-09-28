"use client";

import { useEffect, useState } from "react";
import { absoluteTime, relativeTime } from "@/lib/relativeTime";

/*
  "Updated 5 min ago" for one editable item on the manage page. Staff-only: this
  lives under components/manage and is never rendered by the public
  /information display.

  Renders NOTHING when there is no trustworthy timestamp. Rows that predate the
  updated_at column hold NULL (see migration 0023), and a made-up time is worse
  than no time at all for someone deciding whether a slide is stale.
*/

/*
  One interval for the whole page, not one per item. The custom slides list can
  hold a few dozen panels, and a timer each would mean a few dozen wake-ups a
  minute to re-render text that changes at the same moment for all of them.
  Subscribers share this single tick.
*/
const subscribers = new Set<() => void>();
let ticker: ReturnType<typeof setInterval> | null = null;

function subscribeToMinuteTick(onTick: () => void): () => void {
  subscribers.add(onTick);
  if (!ticker) {
    ticker = setInterval(() => {
      subscribers.forEach((fn) => fn());
    }, 60_000);
  }
  return () => {
    subscribers.delete(onTick);
    if (subscribers.size === 0 && ticker) {
      clearInterval(ticker);
      ticker = null;
    }
  };
}

export default function UpdatedAt({
  at,
  className = "",
}: {
  // ISO timestamp from the row, or null/undefined when untracked.
  at: string | null | undefined;
  className?: string;
}) {
  // Re-read the clock on every tick. The timestamp itself doesn't change, the
  // distance from now does.
  const [, setTick] = useState(0);
  useEffect(
    () => subscribeToMinuteTick(() => setTick((n) => n + 1)),
    [],
  );

  const relative = relativeTime(at);
  if (!relative) return null;

  return (
    <span
      className={`shrink-0 text-sm font-normal text-ink/50 ${className}`}
      // The coarse label rounds; the exact instant is always one hover away.
      title={absoluteTime(at) ?? undefined}
    >
      {/* "on May 4, 2026" past a week, so the wording stays grammatical. */}
      Updated {relative}
    </span>
  );
}
