"use client";

import { useEffect } from "react";
import {
  BUILD_VERSION,
  armReloadAtNextSlide,
  fetchDeployedVersion,
} from "@/lib/buildVersion";

/*
  Brings an open wall TV onto newly deployed code. The bulletin's own refresh
  only re-reads data, so without this a deploy never reaches a screen that
  stays open 24/7.

  Every CHECK_INTERVAL it asks /api/version which deploy is live. Only when
  that differs from the code running here does it consider reloading, and it
  stays on the current page (whose content is already the last known good)
  whenever anything is in doubt:
    - version check fails, times out, or the network is down: do nothing;
    - the page itself doesn't load fine right now (preflight): do nothing, so
      a reload can't land the TV on the browser's own error page;
    - session storage unavailable: do nothing, because the loop guard needs it.
  Otherwise it arms a reload for the next slide switch (see reloadAtSlideSwitch
  in lib/buildVersion), so the change looks like an ordinary slide change.

  Loop guard: one reload per target version per RETRY_AFTER, and at most
  MAX_ATTEMPTS for that version in this tab. Normally the reload brings in the
  new code, the versions match, and this goes quiet; the guard only matters if
  the new page somehow still serves the old build.

  Renders nothing and, like ScreenHeartbeat, does all its work in effects and
  promise callbacks, so a failure here can never reach the route's error page.
*/
const CHECK_INTERVAL = 600_000; // 10 minutes, matching InformationDisplay
const ARM_FOR = 90_000; // three slide switches' worth (PAGE_DURATION is 30s)
const RETRY_AFTER = 60 * 60_000;
const MAX_ATTEMPTS = 3;
const PREFLIGHT_TIMEOUT = 8000;
const STORAGE_KEY = "smcs-build-reload";

type Attempt = { target: string; attempts: number; at: number };

function readAttempt(): Attempt | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Partial<Attempt> | null;
  if (
    typeof parsed?.target !== "string" ||
    typeof parsed.attempts !== "number" ||
    typeof parsed.at !== "number"
  ) {
    return null;
  }
  return parsed as Attempt;
}

function mayReloadFor(target: string): boolean {
  try {
    const prev = readAttempt();
    if (!prev || prev.target !== target) return true;
    return prev.attempts < MAX_ATTEMPTS && Date.now() - prev.at >= RETRY_AFTER;
  } catch {
    return false;
  }
}

// Records the attempt first; if that can't be written, no reload.
function reloadFor(target: string): boolean {
  try {
    const prev = readAttempt();
    const attempts = prev?.target === target ? prev.attempts + 1 : 1;
    const next: Attempt = { target, attempts, at: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    return false;
  }
  location.reload();
  return true;
}

// Does this exact URL load fine right now? Same URL Yodeck loads, uncached.
async function pageIsServable(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PREFLIGHT_TIMEOUT);
  try {
    const res = await fetch(location.href, {
      cache: "no-store",
      signal: controller.signal,
    });
    const isHtml = (res.headers.get("content-type") ?? "").includes("text/html");
    res.body?.cancel().catch(() => {});
    return res.ok && isHtml;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export default function BuildVersionWatcher() {
  useEffect(() => {
    if (BUILD_VERSION === "dev") return;
    let cancelled = false;

    const check = async () => {
      const deployed = await fetchDeployedVersion();
      if (cancelled || !deployed || deployed === "dev" || deployed === BUILD_VERSION) {
        return;
      }
      if (!mayReloadFor(deployed)) return;
      if (!(await pageIsServable()) || cancelled) return;
      armReloadAtNextSlide(() => reloadFor(deployed), ARM_FOR);
    };

    const id = setInterval(() => {
      check().catch(() => {
        /* silent by design */
      });
    }, CHECK_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return null;
}
