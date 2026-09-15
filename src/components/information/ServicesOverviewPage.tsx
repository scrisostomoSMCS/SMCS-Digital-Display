"use client";

import { motion } from "framer-motion";
import InfoPageShell from "./InfoPageShell";
import InfoEyebrow from "./InfoEyebrow";
import ExpandableServiceCard from "./ExpandableServiceCard";
import { staggerContainer, headerIn } from "./motion";
import { BED_PANEL_CLEARANCE } from "@/components/BedAvailabilitySlide";
import { type InfoService } from "@/lib/infoContent";

/*
  One "This Week's Services" page: up to 4 tall vertical service cards in a
  single row, sized to hold full (untruncated) descriptions and stay readable
  from across a room. The bottom band is left intentionally empty, reserved for
  a future live bed-availability display. Multiple numbered pages render
  consecutively in the rotation (see InformationDisplay). This same component
  drives both the editor preview and the live display so they always match.
*/
export default function ServicesOverviewPage({
  title,
  titleEs,
  services,
  pageNumber,
  totalPages,
  animate = true,
}: {
  title: string;
  titleEs?: string;
  services: InfoService[];
  pageNumber: number;
  totalPages: number;
  // false renders the finished state with no entrance animation, for the
  // manage page's static preview.
  animate?: boolean;
}) {
  const init = animate ? "hidden" : false;
  return (
    <InfoPageShell bg="paper">
      <motion.header
        variants={headerIn}
        initial={init}
        animate="show"
        className={`shrink-0 ${BED_PANEL_CLEARANCE}`}
      >
        <InfoEyebrow bg="paper" />
        <h1 className="font-display mt-1 max-w-[68%] flex flex-wrap items-baseline gap-x-4 leading-none">
          <span className="text-4xl @min-[40rem]:text-5xl @min-[64rem]:text-6xl">{title}</span>
          {titleEs && (
            <span className="text-3xl text-ink/60 @min-[40rem]:text-3xl @min-[64rem]:text-4xl">
              {titleEs}
            </span>
          )}
        </h1>
        {totalPages > 1 && (
          <p className="font-body mt-2 max-w-[68%] text-2xl font-semibold uppercase tracking-widest text-blue/70 @min-[64rem]:text-2xl">
            Page {pageNumber} of {totalPages} · Página {pageNumber} de{" "}
            {totalPages}
          </p>
        )}
      </motion.header>

      {/* Up to 4 tall vertical "slabs" side by side. The row is at least ~55% of
          the canvas height (slab look) and GROWS to fit the longest card so no
          description is ever cut off; the cards stretch to equal height. Never
          scrolls or clips. cqh, not vh: the canvas is the reference, not the
          browser window. */}
      <motion.div
        variants={staggerContainer}
        initial={init}
        animate="show"
        className="mt-5 grid grid-cols-1 gap-4 @min-[40rem]:grid-cols-2 @min-[64rem]:mt-8 @min-[64rem]:grid-cols-4 @min-[64rem]:grid-rows-1 @min-[64rem]:gap-6 @min-[64rem]:min-h-[55cqh]"
      >
        {services.slice(0, 4).map((s, i) => {
          const blue = i % 2 === 0;
          return (
            <ExpandableServiceCard
              key={`${s.name}-${i}`}
              service={s}
              tone={blue ? "blue" : "teal"}
              roomy
            />
          );
        })}
      </motion.div>

      {/* Flexible empty band reserved for a future live bed-availability
          display: it fills whatever height is left below the cards. */}
      <div aria-hidden="true" className="hidden @min-[64rem]:block @min-[64rem]:flex-1" />
    </InfoPageShell>
  );
}
