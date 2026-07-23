"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { PAGE_DURATION } from "@/lib/informationContent";
import {
  fetchInfoContent,
  defaultInfoContent,
  type InfoContent,
} from "@/lib/infoContent";
import { fetchSlides, type Slide } from "@/lib/slides";
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
// TEMP DEBUG (bed availability) — remove with the {bedDebug} block below.
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
const toneForBg = (bg: "blue" | "teal" | "paper"): Tone =>
  bg === "blue" ? "white" : bg === "teal" ? "ink" : "blue";

/*
  Rotation controller: auto-advances on a continuous loop, each page shown for
  PAGE_DURATION. Order: the two services pages, new arrivals, demographic,
  events today (minus hidden built-ins), then employee-created custom slides.
  Content, slides, and hidden-settings load from Supabase and stay live.
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
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
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
    tone: "blue" as Tone,
  }));

  // Built-in pages, each tagged with a key (for hiding) and a dot tone.
  const builtinDefs: {
    key: BuiltinKey;
    pageKey: string;
    node: React.ReactNode;
    tone: Tone;
  }[] = [
    ...servicesDefs,
    {
      key: "new-arrivals",
      pageKey: FIXED_BULLETIN_PAGE_KEYS.newArrivals,
      node: <NewArrivalsPage content={content.newArrivals} />,
      tone: "white",
    },
    {
      key: "demographic",
      pageKey: FIXED_BULLETIN_PAGE_KEYS.demographic,
      node: <DemographicPage content={content.demographic} />,
      tone: "ink",
    },
    {
      key: "events-today",
      pageKey: FIXED_BULLETIN_PAGE_KEYS.eventsToday,
      node: <EventsTodayPage />,
      tone: "blue",
    },
  ];
  const builtins = builtinDefs.filter((page) => {
    if (hidden.includes(page.key)) return false;
    return pageIsVisible(page.pageKey);
  });

  const custom = slides.map((s) => ({
    node: <CustomSlidePage key={s.id} slide={s} />,
    tone: toneForBg(s.background),
  }));

  const all = [...builtins, ...custom];
  const pages = all.map((p) => p.node);
  const dotTones = all.map((p) => p.tone);

  useEffect(() => {
    // Phones and tablets are interactive: keep the selected page in place so
    // expanded cards do not disappear while someone is reading them.
    if (pages.length === 0 || compact) return;
    const id = setTimeout(
      () => setActive((a) => (a + 1) % pages.length),
      PAGE_DURATION,
    );
    return () => clearTimeout(id);
  }, [active, compact, pages.length]);

  // --- TEMP DEBUG: bed-availability overlay shown on every bulletin page. ---
  // A fixed overlay, so it never enters the rotation array or affects layout.
  // To remove: delete this node, its two {bedDebug} mounts, and the import.
  const bedDebug = (
    <div
      className="fixed left-4 top-4 z-50 max-w-sm bg-white/95 p-3 text-sm font-semibold"
      style={{ border: "3px solid red", color: "red" }}
    >
      <BedAvailabilitySlide />
    </div>
  );

  if (pages.length === 0) {
    return <div className="h-full w-full bg-paper lg:h-screen lg:w-screen" />;
  }

  // Mobile / tablet: no kiosk rotation. Render every page stacked so the whole
  // bulletin is one long scrollable document with all content fully readable.
  if (compact) {
    return (
      <div className="font-body bg-paper text-ink">
        {bedDebug}
        {pages.map((node, i) => (
          <section key={i}>{node}</section>
        ))}
      </div>
    );
  }

  const current = active % pages.length;

  return (
    <div className="font-body relative h-full w-full overflow-hidden bg-paper text-ink lg:h-screen lg:w-screen">
      {bedDebug}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          className="h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {pages[current]}
        </motion.div>
      </AnimatePresence>

      <Link
        href="/"
        className="absolute right-8 top-8 z-10 hidden border-2 border-blue bg-paper px-5 py-2 text-lg font-semibold text-blue hover:bg-blue hover:text-paper lg:inline-block"
      >
        ← Back to home
      </Link>

      {/* Each compact dot gets its own contrast ring so it remains visible over
          any card color without adding a panel over the slide content. */}
      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-5">
        {pages.map((_, i) => {
          const c = DOT_CLASS[dotTones[current] ?? "blue"];
          return (
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
          );
        })}
      </div>
    </div>
  );
}
