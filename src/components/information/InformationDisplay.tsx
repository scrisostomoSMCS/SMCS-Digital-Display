"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { PAGE_DURATION } from "@/lib/informationContent";
import { canvasStyle, fitScale } from "@/lib/bulletinCanvas";
import {
  fetchInfoContent,
  defaultInfoContent,
  type InfoContent,
} from "@/lib/infoContent";
import { fetchSlides, type Slide, type SlideBackground } from "@/lib/slides";
import { fetchHiddenBuiltins, type BuiltinKey } from "@/lib/displaySettings";
import {
  fetchBulletinLocationId,
  fetchBulletinPageLocations,
  FIXED_BULLETIN_PAGE_KEYS,
  servicePageKey,
  type BulletinPageLocationMap,
} from "@/lib/bulletinLocations";
import { supabase } from "@/lib/supabase";
import ServicesOverviewPage from "./ServicesOverviewPage";
import NewArrivalsPage from "./NewArrivalsPage";
import DemographicPage from "./DemographicPage";
import EventsTodayPage from "./EventsTodayPage";
import CustomSlidePage from "./CustomSlidePage";
import BedAvailabilitySlide from "@/components/BedAvailabilitySlide";

// Prev/next arrows: bare glyphs, no button chrome — deliberately unlike the
// circled back button at the top, which is a different kind of control (it
// leaves the bulletin) and should not be confused with paging. Black on every
// background by request; note that on the blue slides this is dark-on-dark.
const NAV_CLASS = "text-ink hover:text-blue";

/*
  Paging arrow: a stem plus a head, drawn rather than typed. A text glyph ("←")
  ties length and weight together — the typeface decides both, and text-* scales
  them as one. Here they are separate knobs: strokeWidth sets thickness, and the
  stem's x-extent sets length, so it can be short AND heavy. currentColor makes
  it inherit the color set by NAV_CLASS on the button.
*/
function NavArrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-8 w-8"
      fill="none"
      stroke="currentColor"
      strokeWidth={4.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        d={
          dir === "left"
            ? "M20 12 H6 M12 6 L6 12 L12 18"
            : "M4 12 H18 M12 6 L18 12 L12 18"
        }
      />
    </svg>
  );
}


// Fills the letterbox bars around the scaled canvas with the current slide's own
// background, so an odd-shaped container reads as one field of color.
const STAGE_BG: Record<SlideBackground, string> = {
  paper: "bg-paper",
  blue: "bg-blue",
  teal: "bg-teal",
};

/*
  Rotation controller: auto-advances on a continuous loop, each page shown for
  PAGE_DURATION. Order: the two services pages, new arrivals, demographic,
  events today (minus hidden built-ins), then employee-created custom slides.
  Content, slides, and hidden-settings load from Supabase and stay live.

  Layout: exactly one slide is mounted at a time, drawn on the fixed bulletin
  canvas (see lib/bulletinCanvas) and scaled to fit whatever box this component
  is given — full browser tab, WordPress iframe, or Yodeck screen. The canvas is
  what keeps every context identical; nothing here may key off the viewport,
  because inside an iframe the viewport is just the iframe's own box.
*/
export default function InformationDisplay({ locationSlug }: { locationSlug?: string }) {
  const [active, setActive] = useState(0);
  const [content, setContent] = useState<InfoContent>(defaultInfoContent);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [hidden, setHidden] = useState<BuiltinKey[]>([]);
  const [pageLocations, setPageLocations] = useState<BulletinPageLocationMap>({});
  const [locationId, setLocationId] = useState<string | null>(null);
  const [targetingLoaded, setTargetingLoaded] = useState(!locationSlug);
  const observerRef = useRef<ResizeObserver | null>(null);
  // 0 until measured, which keeps the unscaled canvas from flashing at full size
  // on first paint.
  const [scale, setScale] = useState(0);

  /*
    Measure the box we were given (NOT the window) and scale the canvas to fit.
    A ResizeObserver rather than a resize listener so this also tracks an iframe
    or Yodeck region that changes size without the window changing.

    Attached as a ref callback rather than a mount effect: the stage is absent
    from the tree until there are pages to draw (see the empty-rotation return
    below), which a location-targeted bulletin always is on its first render
    while targeting loads. A mount effect would have measured a null stage once,
    never run again, and left scale at 0 — an invisible canvas on a paper-white
    stage, i.e. a permanently blank screen.
  */
  const measureStage = useCallback((stage: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!stage) return;
    const fit = (width: number, height: number) =>
      setScale(fitScale(width, height));
    fit(stage.clientWidth, stage.clientHeight);
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) fit(box.width, box.height);
    });
    observer.observe(stage);
    observerRef.current = observer;
  }, []);

  useEffect(() => {
    const loadContent = async () => {
      setContent(await fetchInfoContent());
      setContentLoaded(true);
    };
    const loadSlides = async () => setSlides(await fetchSlides(locationSlug));
    const loadHidden = async () => setHidden(await fetchHiddenBuiltins());
    const loadTargeting = async () => {
      if (!locationSlug) {
        setPageLocations({});
        setLocationId(null);
        setTargetingLoaded(true);
        return;
      }
      const [nextPageLocations, nextLocationId] = await Promise.all([
        fetchBulletinPageLocations(),
        fetchBulletinLocationId(locationSlug),
      ]);
      setPageLocations(nextPageLocations);
      setLocationId(nextLocationId);
      setTargetingLoaded(true);
    };
    setTargetingLoaded(!locationSlug);
    loadContent();
    loadSlides();
    loadHidden();
    loadTargeting();
    const channel = supabase
      .channel("info-display")
      .on("postgres_changes", { event: "*", schema: "public", table: "info_content" }, loadContent)
      .on("postgres_changes", { event: "*", schema: "public", table: "slides" }, loadSlides)
      .on("postgres_changes", { event: "*", schema: "public", table: "slide_locations" }, loadSlides)
      .on("postgres_changes", { event: "*", schema: "public", table: "builtin_page_locations" }, loadTargeting)
      .on("postgres_changes", { event: "*", schema: "public", table: "bulletin_locations" }, loadTargeting)
      .on("postgres_changes", { event: "*", schema: "public", table: "display_settings" }, loadHidden)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [locationSlug]);

  const pageIsVisible = (pageKey: string, ignoreTargeting: boolean) => {
    if (ignoreTargeting || !locationSlug) return true;
    if (!targetingLoaded || !contentLoaded) return false;
    const targets = pageLocations[pageKey] ?? [];
    return targets.length === 0 || (locationId !== null && targets.includes(locationId));
  };

  // Builds the rotation for this display. `ignoreTargeting` drops the
  // per-location filter, which is how the never-blank fallback below reuses this
  // exact code path instead of assembling a second, divergent page list.
  const buildRotation = (ignoreTargeting: boolean) => {
    // "This Week's Services" is a repeatable, numbered page type: one bulletin
    // page per non-empty services page. Filter before numbering so a location
    // that receives only one service page sees "Page 1 of 1," not a gap.
    const servicesPages = content.services.pages.filter(
      (page) =>
        page.services.length > 0 &&
        pageIsVisible(servicePageKey(page.id), ignoreTargeting),
    );
    const servicesDefs = servicesPages.map((page, i) => ({
      key: "services" as BuiltinKey,
      pageKey: servicePageKey(page.id),
      node: (
        <ServicesOverviewPage
          title={page.title}
          titleEs={page.titleEs}
          services={page.services}
          pageNumber={i + 1}
          totalPages={servicesPages.length}
        />
      ),
      bg: "paper" as SlideBackground,
    }));

    // Built-in pages, each tagged with a key (for hiding) and the background its
    // shell paints, which drives both the nav-arrow tone and the letterbox fill.
    const builtinDefs: {
      key: BuiltinKey;
      pageKey: string;
      node: React.ReactNode;
      bg: SlideBackground;
    }[] = [
      ...servicesDefs,
      {
        key: "new-arrivals",
        pageKey: FIXED_BULLETIN_PAGE_KEYS.newArrivals,
        node: <NewArrivalsPage content={content.newArrivals} />,
        bg: "blue",
      },
      {
        key: "demographic",
        pageKey: FIXED_BULLETIN_PAGE_KEYS.demographic,
        node: <DemographicPage content={content.demographic} />,
        bg: "teal",
      },
      {
        key: "events-today",
        pageKey: FIXED_BULLETIN_PAGE_KEYS.eventsToday,
        node: <EventsTodayPage />,
        bg: "paper",
      },
    ];
    const builtins = builtinDefs.filter((page) => {
      if (hidden.includes(page.key)) return false;
      return pageIsVisible(page.pageKey, ignoreTargeting);
    });

    const custom = slides.map((s) => ({
      node: <CustomSlidePage key={s.id} slide={s} />,
      bg: s.background,
    }));

    return [...builtins, ...custom];
  };

  /*
    Never blank: once loading has settled, a rotation that came out empty falls
    back to the untargeted one. That covers a location slug matching no row in
    bulletin_locations (a mistyped or renamed URL on a wall screen) and a real
    location that every page happens to be targeted away from. A screen showing
    the general bulletin is right in a way an empty white screen never is.
    Built-ins staff have explicitly hidden stay hidden — that is a deliberate
    setting, not a mismatch.
  */
  const targeted = buildRotation(false);
  const settled = !locationSlug || (targetingLoaded && contentLoaded);
  const all = targeted.length > 0 || !settled ? targeted : buildRotation(true);
  const pages = all.map((p) => p.node);
  const backgrounds = all.map((p) => p.bg);

  useEffect(() => {
    if (pages.length === 0) return;
    const id = setTimeout(
      () => setActive((a) => (a + 1) % pages.length),
      PAGE_DURATION,
    );
    return () => clearTimeout(id);
  }, [active, pages.length]);

  if (pages.length === 0) {
    return <div className="h-full w-full bg-paper" />;
  }

  const current = active % pages.length;
  const currentBg = backgrounds[current] ?? "paper";

  return (
    // Stage: fills whatever we were handed (tab, iframe, Yodeck region) and
    // clips. Its only job is to center and scale the canvas.
    <div
      ref={measureStage}
      className={`font-body relative h-full w-full overflow-hidden text-ink ${STAGE_BG[currentBg]}`}
    >
      {/* Canvas: always exactly CANVAS_WIDTH x CANVAS_HEIGHT, so every slide
          lays out identically no matter how big the stage is, then scaled as a
          whole to fit. left/top-1/2 plus the -50% translate centers it, and the
          scale multiplies out from that center. Hidden until measured so it
          cannot flash at full size. */}
      <div
        className="absolute left-1/2 top-1/2 origin-center"
        style={{
          ...canvasStyle,
          transform: `translate(-50%, -50%) scale(${scale})`,
          visibility: scale > 0 ? "visible" : "hidden",
        }}
      >
        {/* mode="wait" plus absolute inset-0: the outgoing slide is unmounted
            before the incoming one mounts, so exactly one slide exists in the
            tree at a time and it always covers the canvas exactly. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            {pages[current]}
          </motion.div>
        </AnimatePresence>

        {/* Live bed availability: top-right callout, white on red so it stands
            out against the paper-white bulletin. Slides keep this corner clear
            via BED_PANEL_CLEARANCE on their header band — widening the panel
            here means re-checking that constant. */}
        <BedAvailabilitySlide className="absolute right-5 top-5 z-20 w-[29rem]" />

        {/* Back button, shrunk to a bare left arrow and parked immediately left of
            the bed panel (right-5 + w-[29rem] = 30.25rem, plus a 0.75rem gap) —
            the one spot on the slide that covers no page content. The accessible
            label carries the full "Back to home" meaning. */}
        <Link
          href="/"
          aria-label="Back to home"
          title="Back to home"
          className="absolute right-[31rem] top-5 z-20 flex h-12 w-12 items-center justify-center rounded-full border-2 border-blue bg-paper text-3xl font-semibold text-blue hover:bg-blue hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <span aria-hidden="true">←</span>
        </Link>

        {/* Manual paging, parked in the two bottom corners so neither arrow sits
            over slide content. Both wrap around, so the rotation has no ends.
            Pressing one also restarts the auto-advance timer, because the
            interval effect is keyed on `active` — a viewer who steps to a page
            gets the full PAGE_DURATION to read it rather than the remainder of
            the previous page's clock. */}
        <button
          type="button"
          onClick={() => setActive((a) => (a - 1 + pages.length) % pages.length)}
          aria-label="Previous page"
          title="Previous page"
          className={`absolute bottom-4 left-5 z-20 flex h-10 w-10 items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 ${NAV_CLASS}`}
        >
          <NavArrow dir="left" />
        </button>
        <button
          type="button"
          onClick={() => setActive((a) => (a + 1) % pages.length)}
          aria-label="Next page"
          title="Next page"
          className={`absolute bottom-4 right-5 z-20 flex h-10 w-10 items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 ${NAV_CLASS}`}
        >
          <NavArrow dir="right" />
        </button>

        {/* Position readout: which page of how many, and a jump target for each.
            Deliberately tiny and low-contrast-when-inactive — this is a status
            indicator for a wall screen, not a control anyone walks up to press,
            so it should register only if you look for it.

            z-10 keeps it above the slide's own opaque background (at z-0 the
            shell would paint straight over it) but below the bed panel and the
            arrows at z-20, so it never draws on top of an information card. */}
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show page ${i + 1}`}
              aria-current={i === current}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === current ? "bg-ink" : "bg-ink/25 hover:bg-ink/50"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
