/*
  Which deploy this code came from, so an open wall TV can tell when it is
  running old code. The bulletin only ever re-reads DATA (Realtime plus a
  10-minute backstop); nothing re-downloads the page, so without this a code
  deploy never reaches a screen until Yodeck reloads it or the TV reboots.

  NEXT_PUBLIC_BUILD_VERSION is set in next.config.ts from Vercel's commit SHA
  and inlined at build time, both into the TV's bundle and into /api/version.
  Outside Vercel it is "dev", and a "dev" build never reloads anything.
*/
export const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION || "dev";

// Short form for the health page; a full SHA is unreadable at a glance.
export const shortVersion = (version: string) => version.slice(0, 7);

/*
  The version the server is deploying right now, or null on any failure. Never
  throws: it runs on unattended TVs. Uses an AbortController rather than
  AbortSignal.timeout, which older player browsers lack.
*/
export async function fetchDeployedVersion(): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch("/api/version", {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    const version = (body as { version?: unknown } | null)?.version;
    return typeof version === "string" && version ? version : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/*
  Slide-switch handoff. BuildVersionWatcher arms a reload once it has decided
  one is safe; InformationDisplay offers it each slide switch, so the reload
  happens where the screen was about to change anyway and looks like one.

  An armed reload expires, so a decision made while the server was reachable
  can't fire long after that stopped being true.
*/
let armed: { reload: () => boolean; until: number } | null = null;

export function armReloadAtNextSlide(reload: () => boolean, forMs: number) {
  armed = { reload, until: Date.now() + forMs };
}

// True if a reload was started, in which case the caller must NOT advance the
// slide: the current one stays up until the new page paints over it.
export function reloadAtSlideSwitch(): boolean {
  const pending = armed;
  armed = null;
  if (!pending || Date.now() > pending.until) return false;
  return pending.reload();
}
