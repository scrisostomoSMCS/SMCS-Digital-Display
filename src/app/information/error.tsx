"use client";

import { useEffect } from "react";

/*
  Crash fallback for the Digital Bulletin route.

  The bulletin runs unattended on wall-mounted TVs, so a client-side throw must
  never leave Next's default error screen (or a blank page) up until someone
  walks over and power-cycles the display. This boundary replaces the crash with
  a card that is still useful to the person standing in front of it, then
  reloads the route so the display recovers on its own.

  SCOPE: React error boundaries catch throws during render and lifecycle, which
  covers the realistic failure here — bad data reaching a render path. They do
  NOT catch throws inside event handlers, setTimeout/setInterval, or promise
  callbacks, so the rotation timer and the realtime handlers in
  InformationDisplay are not covered by this file.

  This renders INSTEAD of information/page.tsx, so that page's wrapper is gone:
  bulletinFontClass is out of scope (hence no font-display/font-body here) and
  the h-dvh comes from this file, without which html's blue overscroll color
  (globals.css) would show through.

  Deliberately does not use the `reset` prop Next passes alongside `error`:
  reset() re-renders the same subtree against the same bad data and would very
  likely throw straight back. A full reload re-fetches from the server, which is
  what actually clears a bad slide row or a stale chunk.
*/
export default function InformationError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error("Digital Bulletin crashed:", error);
    /*
      Self-recovery. If the underlying fault is persistent (Supabase hard down),
      this keeps retrying every 30s indefinitely — intended: an unattended screen
      should keep trying forever, and each attempt is one cheap page load.
    */
    const id = setTimeout(() => location.reload(), 30000);
    return () => clearTimeout(id);
  }, [error]);

  return (
    <div className="flex h-dvh w-full items-center justify-center overflow-hidden bg-paper px-16 text-ink">
      <div className="max-w-5xl border-l-8 border-blue pl-10">
        <p className="text-5xl font-semibold leading-tight">
          Services available at the front desk
        </p>
        <p className="mt-4 text-4xl font-medium text-ink/80">
          Servicios disponibles en recepción
        </p>
      </div>
    </div>
  );
}
