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
import { supabase } from "@/lib/supabase";
import ServicesOverviewPage from "./ServicesOverviewPage";
import NewArrivalsPage from "./NewArrivalsPage";
import DemographicPage from "./DemographicPage";
import EventsTodayPage from "./EventsTodayPage";
import CustomSlidePage from "./CustomSlidePage";

const DOT_CLASS = {
  blue: {
    border: "border-blue",
    on: "bg-blue",
    off: "bg-paper",
    desktopBorder: "lg:border-blue",
    desktopOn: "lg:bg-blue",
    desktopOff: "lg:bg-paper lg:hover:bg-blue/30",
  },
  white: {
    border: "border-paper",
    on: "bg-paper",
    off: "bg-transparent",
    desktopBorder: "lg:border-paper",
    desktopOn: "lg:bg-paper",
    desktopOff: "lg:bg-transparent lg:hover:bg-paper/30",
  },
  ink: {
    border: "border-ink",
    on: "bg-ink",
    off: "bg-transparent",
    desktopBorder: "lg:border-ink",
    desktopOn: "lg:bg-ink",
    desktopOff: "lg:bg-transparent lg:hover:bg-ink/30",
  },
} as const;
type Tone = keyof typeof DOT_CLASS;

// Dot tone that stays visible on a given slide background.
const toneForBg = (bg: "blue" | "teal" | "paper"): Tone =>
  bg === "blue" ? "white" : bg === "teal" ? "ink" : "blue";

/*
  Rotation controller: auto-advances on a continuous loop, each page shown for
  PAGE_DURATION. Order: the built-in pages (services, new arrivals, demographic,
  events today) minus any an employee hid, then employee-created custom slides.
  Content, slides, and hidden-settings load from Supabase and stay live.
*/
export default function InformationDisplay() {
  const [active, setActive] = useState(0);
  const [content, setContent] = useState<InfoContent>(defaultInfoContent);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [hidden, setHidden] = useState<BuiltinKey[]>([]);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const loadContent = async () => setContent(await fetchInfoContent());
    const loadSlides = async () => setSlides(await fetchSlides());
    const loadHidden = async () => setHidden(await fetchHiddenBuiltins());
    loadContent();
    loadSlides();
    loadHidden();
    const channel = supabase
      .channel("info-display")
      .on("postgres_changes", { event: "*", schema: "public", table: "info_content" }, loadContent)
      .on("postgres_changes", { event: "*", schema: "public", table: "slides" }, loadSlides)
      .on("postgres_changes", { event: "*", schema: "public", table: "display_settings" }, loadHidden)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Built-in pages, each tagged with a key (for hiding) and a dot tone.
  const builtinDefs: { key: BuiltinKey; node: React.ReactNode; tone: Tone }[] = [
    { key: "services", node: <ServicesOverviewPage content={content.services} />, tone: "blue" },
    { key: "new-arrivals", node: <NewArrivalsPage content={content.newArrivals} />, tone: "white" },
    { key: "demographic", node: <DemographicPage content={content.demographic} />, tone: "ink" },
    { key: "events-today", node: <EventsTodayPage />, tone: "blue" },
  ];
  const builtins = builtinDefs.filter((b) => !hidden.includes(b.key));

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

  if (pages.length === 0) {
    return <div className="h-full w-full bg-paper lg:h-screen lg:w-screen" />;
  }

  const current = active % pages.length;

  return (
    <div className="font-body relative h-full w-full overflow-hidden bg-paper text-ink lg:h-screen lg:w-screen">
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

      {/* All dots use the CURRENT page's tone so they stay visible. */}
      <div className="absolute inset-x-0 bottom-1 z-10 overflow-x-auto lg:inset-x-auto lg:bottom-8 lg:left-1/2 lg:-translate-x-1/2 lg:overflow-visible">
        <div className="mx-auto flex w-max gap-0 lg:gap-5">
          {pages.map((_, i) => {
            const c = DOT_CLASS[dotTones[current] ?? "blue"];
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show page ${i + 1}`}
                aria-current={i === current}
                className={`flex h-11 w-11 shrink-0 items-center justify-center transition-colors lg:h-5 lg:w-5 lg:rounded-full lg:border-2 ${c.desktopBorder} ${
                  i === current ? c.desktopOn : c.desktopOff
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-3 w-3 rounded-full border-2 lg:hidden ${c.border} ${
                    i === current ? c.on : c.off
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
