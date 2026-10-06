"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { absoluteTime, relativeTime } from "@/lib/relativeTime";
import {
  fetchScreens,
  screenStatus,
  type Screen,
  type ScreenStatus,
} from "@/lib/screens";
import { inputClass } from "./editorFields";
import ScreenManager from "./ScreenManager";

// Polls rather than subscribing: check-ins arrive every 5 minutes per screen,
// so a minute of lag costs nothing and screens stays out of Realtime.
const POLL_INTERVAL = 60_000;

// A screen that keeps checking in but can't read content for this long is
// flagged: the TV is on, but the bulletin may be showing built-in fallbacks.
const CONTENT_STALE_AFTER = 20 * 60_000;

const UNASSIGNED = "__unassigned";

// Worst first. Never seen ranks below offline/delayed: it is usually a TV that
// hasn't been set up yet rather than one that broke.
const STATUS_ORDER: Record<ScreenStatus, number> = {
  offline: 0,
  delayed: 1,
  never: 2,
  online: 3,
};

/*
  Status is always written out next to the dot, never color alone. The theme
  has no amber, so Delayed is a red ring and Offline a solid red dot.
*/
const STATUS_STYLE: Record<
  ScreenStatus,
  { label: string; dot: string; text: string }
> = {
  online: { label: "Online", dot: "bg-green border-green", text: "text-green" },
  delayed: { label: "Delayed", dot: "bg-paper border-red", text: "text-red" },
  offline: { label: "Offline", dot: "bg-red border-red", text: "text-red" },
  never: { label: "Never seen", dot: "bg-paper border-ink/40", text: "text-ink/60" },
};

function StatusBadge({ status }: { status: ScreenStatus }) {
  const style = STATUS_STYLE[status];
  return (
    <span className={`flex items-center gap-2 font-semibold ${style.text}`}>
      <span
        aria-hidden="true"
        className={`inline-block h-4 w-4 shrink-0 rounded-full border-[3px] ${style.dot}`}
      />
      {style.label}
    </span>
  );
}

function Timestamp({ at, now }: { at: string | null; now: number }) {
  const relative = relativeTime(at, now);
  if (!relative) return <span className="text-ink/40">—</span>;
  return <span title={absoluteTime(at) ?? undefined}>{relative}</span>;
}

export default function ScreenHealth() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    const result = await fetchScreens();
    setNow(Date.now());
    setLoaded(true);
    // On a failed poll keep the last good list on screen and say so, rather
    // than replacing it with an empty, healthy-looking table.
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setScreens(result.screens);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [load]);

  // Filter choices come from the screens themselves, so the list only offers
  // locations that actually have a screen.
  const locationOptions = useMemo(() => {
    const byId = new Map<string, string>();
    let hasUnassigned = false;
    for (const s of screens) {
      if (s.locationId && s.locationName) byId.set(s.locationId, s.locationName);
      else hasUnassigned = true;
    }
    return {
      locations: [...byId].sort((a, b) => a[1].localeCompare(b[1])),
      hasUnassigned,
    };
  }, [screens]);

  const rows = useMemo(() => {
    const visible = screens.filter((s) => {
      if (filter === "all") return true;
      if (filter === UNASSIGNED) return !s.locationId;
      return s.locationId === filter;
    });
    return visible
      .map((s) => ({ screen: s, status: screenStatus(s.lastSeen, now) }))
      .sort((a, b) => {
        const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (byStatus !== 0) return byStatus;
        // Within a status, the one silent longest comes first.
        const seenA = a.screen.lastSeen ? Date.parse(a.screen.lastSeen) : 0;
        const seenB = b.screen.lastSeen ? Date.parse(b.screen.lastSeen) : 0;
        if (seenA !== seenB) return seenA - seenB;
        return a.screen.name.localeCompare(b.screen.name);
      });
  }, [screens, filter, now]);

  const counts = useMemo(() => {
    const c: Record<ScreenStatus, number> = { online: 0, delayed: 0, offline: 0, never: 0 };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);

  const summary = [
    `${counts.online} online`,
    `${counts.delayed} delayed`,
    `${counts.offline} offline`,
    ...(counts.never > 0 ? [`${counts.never} never seen`] : []),
  ].join(" · ");

  // The selected location can disappear (its last screen moved or deleted).
  const filterIsValid =
    filter === "all" ||
    (filter === UNASSIGNED && locationOptions.hasUnassigned) ||
    locationOptions.locations.some(([id]) => id === filter);
  useEffect(() => {
    if (loaded && !filterIsValid) setFilter("all");
  }, [loaded, filterIsValid]);

  const contentIsStale = (s: Screen) => {
    if (!s.lastSeen) return false;
    const seen = Date.parse(s.lastSeen);
    const synced = s.lastContentSync ? Date.parse(s.lastContentSync) : 0;
    return seen - synced > CONTENT_STALE_AFTER;
  };

  if (!loaded) {
    return <p className="text-lg text-ink/60">Loading screens…</p>;
  }

  return (
    <div>
      {error && (
        <p
          role="alert"
          className="mb-4 border-l-4 border-red bg-red/5 px-3 py-2 text-base font-semibold text-red"
        >
          Couldn&rsquo;t refresh screen status ({error}). Showing the last
          results; this page will try again in a minute.
        </p>
      )}

      {screens.length === 0 ? (
        <p className="text-lg text-ink/60">
          No screens registered yet. Add one under Manage screens below.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <p className="text-2xl font-bold text-blue" aria-live="polite">
              {summary}
            </p>
            <label className="block w-full sm:w-72">
              <span className="block text-base font-semibold">Location</span>
              <select
                className={inputClass}
                value={filterIsValid ? filter : "all"}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All locations</option>
                {locationOptions.locations.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
                {locationOptions.hasUnassigned && (
                  <option value={UNASSIGNED}>No location</option>
                )}
              </select>
            </label>
          </div>

          <div className="mt-5 overflow-x-auto border-2 border-placeholder">
            <table className="w-full min-w-[720px] text-left text-base">
              <thead className="border-b-2 border-placeholder bg-ink/5">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Screen</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Location</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Last seen</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Content last loaded</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ screen, status }) => (
                  <tr key={screen.id} className="border-b border-placeholder last:border-b-0">
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-semibold">{screen.name}</span>
                      <span className="block text-sm text-ink/60">{screen.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      {screen.locationName ?? <span className="text-ink/40">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Timestamp at={screen.lastSeen} now={now} />
                    </td>
                    <td className="px-4 py-3">
                      <Timestamp at={screen.lastContentSync} now={now} />
                      {contentIsStale(screen) && (
                        <span className="block text-sm font-semibold text-red">
                          Can&rsquo;t load content
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ScreenManager screens={screens} onChanged={load} />
    </div>
  );
}
