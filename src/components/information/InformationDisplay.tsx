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
import { supabase } from "@/lib/supabase";
import ServicesOverviewPage from "./ServicesOverviewPage";
import NewArrivalsPage from "./NewArrivalsPage";
import DemographicPage from "./DemographicPage";
import EventsTodayPage from "./EventsTodayPage";

// Dot color per page so the indicator stays visible on each page's background
// (white / blue / teal). Keep in sync with PAGE_COUNT / the render order below.
const DOT_TONE = ["blue", "white", "ink", "blue"] as const;
const PAGE_COUNT = DOT_TONE.length;
const DOT_CLASS = {
  blue: { border: "border-blue", on: "bg-blue", off: "bg-paper hover:bg-blue/30" },
  white: { border: "border-paper", on: "bg-paper", off: "hover:bg-paper/30" },
  ink: { border: "border-ink", on: "bg-ink", off: "hover:bg-ink/30" },
} as const;

/*
  Rotation controller: auto-advances through the four pages on a continuous loop
  (services → new arrivals → demographic → events today → …), each shown for
  PAGE_DURATION. The three messaging pages are content-driven from Supabase
  (edited on the manage page); the events-today page reads live events itself.
*/
export default function InformationDisplay() {
  const [active, setActive] = useState(0);
  const [content, setContent] = useState<InfoContent>(defaultInfoContent);

  // Load editable content and keep it live if an employee saves an edit.
  useEffect(() => {
    const load = async () => setContent(await fetchInfoContent());
    load();
    const channel = supabase
      .channel("info-content")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "info_content" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Advance on a timer keyed to `active`, so clicking a dot resets the countdown.
  useEffect(() => {
    const id = setTimeout(
      () => setActive((a) => (a + 1) % PAGE_COUNT),
      PAGE_DURATION,
    );
    return () => clearTimeout(id);
  }, [active]);

  const pages = [
    <ServicesOverviewPage key="s" content={content.services} />,
    <NewArrivalsPage key="n" content={content.newArrivals} />,
    <DemographicPage key="d" content={content.demographic} />,
    <EventsTodayPage key="e" />,
  ];

  return (
    <div className="font-body relative h-screen w-screen overflow-hidden bg-paper text-ink">
      {/* Framer Motion cross-fades between pages; each page's own entrance
          animations (headline + staggered cards) play as it mounts. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          className="h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {pages[active]}
        </motion.div>
      </AnimatePresence>

      {/* Back to home for anyone who walks up and taps the screen. */}
      <Link
        href="/"
        className="absolute right-8 top-8 z-10 border-2 border-blue bg-paper px-5 py-2 text-lg font-semibold text-blue hover:bg-blue hover:text-paper"
      >
        ← Back to home
      </Link>

      {/* Page indicator dots — clickable to jump between pages. Colored to stay
          visible on the current page's background. */}
      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-5">
        {pages.map((_, i) => {
          const c = DOT_CLASS[DOT_TONE[active]];
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show page ${i + 1}`}
              aria-current={i === active}
              className={`h-5 w-5 rounded-full border-2 transition-colors ${c.border} ${
                i === active ? c.on : c.off
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
