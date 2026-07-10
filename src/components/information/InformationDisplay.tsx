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
import { supabase } from "@/lib/supabase";
import ServicesOverviewPage from "./ServicesOverviewPage";
import NewArrivalsPage from "./NewArrivalsPage";
import DemographicPage from "./DemographicPage";
import EventsTodayPage from "./EventsTodayPage";
import CustomSlidePage from "./CustomSlidePage";

const DOT_CLASS = {
  blue: { border: "border-blue", on: "bg-blue", off: "bg-paper hover:bg-blue/30" },
  white: { border: "border-paper", on: "bg-paper", off: "hover:bg-paper/30" },
  ink: { border: "border-ink", on: "bg-ink", off: "hover:bg-ink/30" },
} as const;
type Tone = keyof typeof DOT_CLASS;

// Dot tone per built-in page (visible on its background); custom-slide
// backgrounds cycle blue → teal → white, so their dot tones cycle to match.
const BASE_TONES: Tone[] = ["blue", "white", "ink", "blue"];
const SLIDE_TONES: Tone[] = ["white", "ink", "blue"];

/*
  Rotation controller: auto-advances on a continuous loop, each page shown for
  PAGE_DURATION. Order: the three content-driven messaging pages, then events
  today, then any employee-created custom slides (slides table) at the end.
  Content + slides load from Supabase and stay live via realtime.
*/
export default function InformationDisplay() {
  const [active, setActive] = useState(0);
  const [content, setContent] = useState<InfoContent>(defaultInfoContent);
  const [slides, setSlides] = useState<Slide[]>([]);

  useEffect(() => {
    const loadContent = async () => setContent(await fetchInfoContent());
    const loadSlides = async () => setSlides(await fetchSlides());
    loadContent();
    loadSlides();
    const channel = supabase
      .channel("info-display")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "info_content" },
        loadContent,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "slides" },
        loadSlides,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const pages = [
    <ServicesOverviewPage key="s" content={content.services} />,
    <NewArrivalsPage key="n" content={content.newArrivals} />,
    <DemographicPage key="d" content={content.demographic} />,
    <EventsTodayPage key="e" />,
    ...slides.map((s, i) => <CustomSlidePage key={s.id} slide={s} index={i} />),
  ];
  const dotTones: Tone[] = [
    ...BASE_TONES,
    ...slides.map((_, i) => SLIDE_TONES[i % SLIDE_TONES.length]),
  ];

  // Advance on a timer; depends on page count so adding/removing slides reflows.
  useEffect(() => {
    const id = setTimeout(
      () => setActive((a) => (a + 1) % pages.length),
      PAGE_DURATION,
    );
    return () => clearTimeout(id);
  }, [active, pages.length]);

  // Guard against a stale index if slides were removed mid-cycle.
  const current = active % pages.length;

  return (
    <div className="font-body relative h-screen w-screen overflow-hidden bg-paper text-ink">
      {/* Framer Motion cross-fades between pages; each page's own entrance
          animations play as it mounts. */}
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

      {/* Back to home for anyone who walks up and taps the screen. */}
      <Link
        href="/"
        className="absolute right-8 top-8 z-10 border-2 border-blue bg-paper px-5 py-2 text-lg font-semibold text-blue hover:bg-blue hover:text-paper"
      >
        ← Back to home
      </Link>

      {/* Page indicator dots — clickable. All dots use the CURRENT page's tone
          so they stay visible on whatever background is showing. */}
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
              className={`h-5 w-5 rounded-full border-2 transition-colors ${c.border} ${
                i === current ? c.on : c.off
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
