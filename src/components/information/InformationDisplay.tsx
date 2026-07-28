"use client";

import { useEffect, useRef, useState } from "react";
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

const DOT_CLASS = {
  blue: {
    border: "border-blue",
    on: "bg-blue",
    off: "bg-paper hover:bg-blue/30",
    ring: "ring-paper",
  },
  white: {
    border: "border-paper",
    on: "bg-paper",
    off: "hover:bg-paper/30",
    ring: "ring-ink/50",
  },
  ink: {
    border: "border-ink",
    on: "bg-ink",
    off: "hover:bg-ink/30",
    ring: "ring-paper",
  },
} as const;
type Tone = keyof typeof DOT_CLASS;

// Dot tone that stays visible on a given slide background.
const toneForBg = (bg: SlideBackground): Tone =>
  bg === "blue" ? "white" : bg === "teal" ? "ink" : "blue";

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
  const stageRef = useRef<HTMLDivElement>(null);
  // 0 until measured, which keeps the unscaled canvas from flashing at full size
  // on first paint.
  const [scale, setScale] = useState(0);

  // Measure the box we were given (NOT the window) and scale the canvas to fit.
  // A ResizeObserver rather than a resize listener so this also tracks an iframe
  // or Yodeck region that changes size without the window changing.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = (width: number, height: number) =>
      setScale(fitScale(width, height));
    fit(stage.clientWidth, stage.clientHeight);
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) fit(box.width, box.height);
    });
    observer.observe(stage);
    return () => observer.disconnect();
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

  const pageIsVisible = (pageKey: string) => {
    if (!locationSlug) return true;
    if (!targetingLoaded || !contentLoaded) return false;
    const targets = pageLocations[pageKey] ?? [];
    return targets.length === 0 || (locationId !== null && targets.includes(locationId));
  };

  // "This Week's Services" is a repeatable, numbered page type: one bulletin
  // page per non-empty services page. Filter before numbering so a location
  // that receives only one service page sees "Page 1 of 1," not a gap.
  const servicesPages = content.services.pages.filter(
    (page) =>
      page.services.length > 0 && pageIsVisible(servicePageKey(page.id)),
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
  // shell paints, which drives both the dot tone and the letterbox fill.
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
    return pageIsVisible(page.pageKey);
  });

  const custom = slides.map((s) => ({
    node: <CustomSlidePage key={s.id} slide={s} />,
    bg: s.background,
  }));

  const all = [...builtins, ...custom];
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
  const c = DOT_CLASS[toneForBg(currentBg)];

  return (
    // Stage: fills whatever we were handed (tab, iframe, Yodeck region) and
    // clips. Its only job is to center and scale the canvas.
    <div
      ref={stageRef}
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
            out against the paper-white bulletin. */}
        <BedAvailabilitySlide className="absolute right-5 top-5 z-20 w-80" />

        {/* Back button, shrunk to a bare left arrow and parked immediately left of
            the bed panel (right-5 + w-80 = 21.25rem, plus a 0.75rem gap) — the one
            spot on the slide that covers no page content. The accessible label
            carries the full "Back to home" meaning. */}
        <Link
          href="/"
          aria-label="Back to home"
          title="Back to home"
          className="absolute right-[22rem] top-5 z-20 flex h-12 w-12 items-center justify-center rounded-full border-2 border-blue bg-paper text-3xl font-semibold text-blue hover:bg-blue hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <span aria-hidden="true">←</span>
        </Link>

        {/* Each compact dot gets its own contrast ring so it remains visible over
            any card color without adding a panel over the slide content. */}
        <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-5">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show page ${i + 1}`}
              aria-current={i === current}
              className={`h-5 w-5 rounded-full border-2 ring-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 ${c.border} ${c.ring} ${
                i === current ? c.on : c.off
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
