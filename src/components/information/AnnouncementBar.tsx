"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import {
  fetchLiveAnnouncement,
  remainingMs,
  type Announcement,
} from "@/lib/announcements";

/*
  Staff announcement bubble, overlaid on the Digital Bulletin canvas.

  White on a deep red (8.49:1, comfortably past WCAG AA). Deliberately NOT the
  --color-red used by the bed panel: the two sit side by side at the top of the
  canvas, and at #c1121f they would read as one continuous band. Going darker
  separates them and buys contrast headroom for the white text.

  RELIABILITY CONTRACT. This bubble is an overlay on a screen people rely on to
  find a bed, so every failure path here ends in "render nothing and leave the
  bulletin exactly as it was":
    - fetchLiveAnnouncement swallows its own errors and returns null.
    - nothing live renders null — no wrapper, no reserved space, no layout shift.
    - a throw in render is caught by the boundary at the bottom of this file,
      which renders null. It must never reach app/information/error.tsx, because
      that boundary replaces the WHOLE bulletin with a fallback card.
*/
const ANNOUNCEMENT_RED = "#9b0f17";

/*
  Backstop poll. Realtime is the fast path and delivers a push in about a
  second; this covers a silently dead socket.

  Deliberately much shorter than InformationDisplay's ten-minute REFRESH_
  INTERVAL: an announcement only lives five minutes, so a ten-minute backstop
  would miss entire announcements rather than merely delaying them. Thirty
  seconds costs one request per screen per thirty seconds and caps the loss at
  10% of the window in the degraded state.
*/
const POLL_INTERVAL = 30_000;

/*
  THE SAFE BAND. The bubble may never grow past this height, because below it
  are the service cards, event rows, and slide content people actually need.

  Measured on the 1920x1080 canvas, and every bulletin page is built the same
  way, so one number covers all of them:

     32px  InfoPageShell's @min-[64rem]:py-8 top padding
  + 200px  BED_PANEL_CLEARANCE (12.5rem), the empty header band every page
           reserves so the bed panel never lands on content
  +  12px  the SMALLEST gap any page leaves under that band — SlideTemplateView's
           image-focus variant (@min-[64rem]:mt-3). Others leave 20-32px; the
           tightest one is what has to be safe.
  = 244px  the y at which real content can begin on the tightest page

  The bubble starts at top-5 (20px), so it gets 224px. If BED_PANEL_CLEARANCE or
  that mt-3 ever changes, re-derive these two numbers — same contract the bed
  panel already documents in BedAvailabilitySlide.
*/
const BUBBLE_TOP = 20;
const CONTENT_STARTS_AT = 244;
const MAX_BUBBLE_HEIGHT = CONTENT_STARTS_AT - BUBBLE_TOP;

/*
  Message sizes to try, largest first, in canvas pixels. The first one that fits
  inside MAX_BUBBLE_HEIGHT wins.

  Sizing is the one elastic constraint here. "Never clip", "never scroll",
  "never cover the cards", "hold 200 characters" and "stay legible across a
  room" cannot all hold at a fixed size, so the text shrinks rather than the
  bubble overflowing. 36px matches the old text-4xl and is a step above the
  slides' own text-3xl body copy; even the 24px floor is no smaller than the
  supporting text already on these pages, and 200 characters fits there in two
  lines with room to spare.
*/
const MESSAGE_SIZES = [36, 32, 28, 24];
const MESSAGE_LINE_HEIGHT = 1.3;

function AnnouncementBubble({ className = "" }: { className?: string }) {
  const [live, setLive] = useState<Announcement | null>(null);
  // Index into MESSAGE_SIZES, and whether the fit pass below has finished.
  const [sizeIndex, setSizeIndex] = useState(0);
  const [fitted, setFitted] = useState(false);
  const bubbleRef = useRef<HTMLElement | null>(null);
  /*
    Announcements this display has already retired via the timer below. An
    expired id is never shown again, whatever a later fetch returns.

    This is what makes the client-side expiry authoritative in the one direction
    that matters. Without it, a wall screen whose clock runs fast would expire
    the bubble early and then have the very next poll — which the database still
    considers live — put it straight back, flickering on and off for the rest of
    the window. Belt and suspenders means the bubble comes down and stays down.
  */
  const retiredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const next = await fetchLiveAnnouncement();
      if (cancelled) return;
      setLive(next && retiredRef.current.has(next.id) ? null : next);
    };
    load();
    // Fast path. Its own channel rather than a line on InformationDisplay's
    // "info-display" channel, so this feature's subscription lives and dies
    // with this component and cannot disturb the slide rotation's.
    const channel = supabase
      .channel("info-announcements")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        load,
      )
      .subscribe();
    const poll = setInterval(load, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, []);

  /*
    Expiry guarantee #2 (#1 is the RLS predicate on expires_at, evaluated
    against the database clock on every read).

    A timer for the exact remaining milliseconds, so the bubble comes down on
    schedule even if the next fetch is late, cached, or fails outright — the
    case that matters, because nobody is standing at the TV to notice. See
    remainingMs for how a wrong clock on the display is bounded.
  */
  useEffect(() => {
    if (!live) return;
    const ms = remainingMs(live);
    const retire = () => {
      retiredRef.current.add(live.id);
      setLive(null);
    };
    if (ms <= 0) {
      retire();
      return;
    }
    const id = setTimeout(retire, ms);
    return () => clearTimeout(id);
  }, [live]);

  // Restart the fit pass whenever the message changes.
  const liveId = live?.id;
  useEffect(() => {
    setSizeIndex(0);
    setFitted(false);
  }, [liveId]);

  /*
    Fit pass: measure the rendered bubble and step down one size at a time until
    it fits the safe band. Measured rather than derived from character count,
    because how many lines 200 characters take depends on the typeface's
    metrics and on where the words happen to break — an estimate that is wrong
    by one line puts the bubble straight over a service card.

    offsetHeight is layout pixels, unaffected by the canvas's scale transform,
    so this measures canvas px on every screen size.

    useEffect rather than useLayoutEffect: this component is prerendered on the
    server, where useLayoutEffect warns. The cost is that the first paint at a
    too-large size would be visible, which is why the bubble stays hidden until
    `fitted` — see the visibility style below.
  */
  useEffect(() => {
    if (!liveId) return;
    const el = bubbleRef.current;
    if (!el) return;
    if (el.offsetHeight > MAX_BUBBLE_HEIGHT && sizeIndex < MESSAGE_SIZES.length - 1) {
      setSizeIndex((i) => i + 1);
      return;
    }
    setFitted(true);
  }, [liveId, sizeIndex]);

  // Nothing live: nothing in the tree at all.
  if (!live) return null;

  return (
    <section
      ref={bubbleRef}
      // Display-only; it must never swallow a click meant for the controls the
      // bulletin already has.
      className={`pointer-events-none rounded-2xl px-10 py-6 text-paper shadow-2xl ${className}`}
      style={{
        backgroundColor: ANNOUNCEMENT_RED,
        // Hidden, not unmounted, while the fit pass runs: the browser still
        // lays it out (so offsetHeight is real) but nothing is painted, so an
        // oversized first frame can never flash over the cards below.
        visibility: fitted ? "visible" : "hidden",
      }}
      aria-live="polite"
    >
      <p className="text-2xl font-bold uppercase tracking-[0.2em]">
        Announcement
      </p>
      {/*
        break-words with no height cap and no overflow rule: the message always
        renders in full. Length is absorbed by the font size chosen above, never
        by clipping or scrolling.
      */}
      <p
        className="mt-2 font-semibold break-words"
        style={{
          fontSize: `${MESSAGE_SIZES[sizeIndex]}px`,
          lineHeight: MESSAGE_LINE_HEIGHT,
        }}
      >
        {live.message}
      </p>
    </section>
  );
}

/*
  Renders null if anything inside throws. React error boundaries must be class
  components; this is the whole reason for the one class in this codebase.

  Scope, same as any boundary: throws during render and lifecycle. The async
  loader above cannot throw into this (fetchLiveAnnouncement catches its own
  errors and the RPCs are not called from here), so the realistic case is a bad
  row reaching the markup.
*/
class AnnouncementBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Announcement bubble failed, hiding it:", error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function AnnouncementBar({ className = "" }: { className?: string }) {
  return (
    <AnnouncementBoundary>
      <AnnouncementBubble className={className} />
    </AnnouncementBoundary>
  );
}
