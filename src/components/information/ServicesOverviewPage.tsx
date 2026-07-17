"use client";

import { motion } from "framer-motion";
import InfoPageShell from "./InfoPageShell";
import InfoEyebrow from "./InfoEyebrow";
import ExpandableServiceCard from "./ExpandableServiceCard";
import { staggerContainer, headerIn } from "./motion";
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
}: {
  title: string;
  titleEs?: string;
  services: InfoService[];
  pageNumber: number;
  totalPages: number;
}) {
  return (
    <InfoPageShell bg="paper">
      <motion.header
        variants={headerIn}
        initial="hidden"
        animate="show"
        className="shrink-0"
      >
        <InfoEyebrow tone="blue" />
        <h1 className="font-display mt-1 flex flex-wrap items-baseline gap-x-4 leading-none">
          <span className="text-3xl sm:text-4xl lg:text-5xl">{title}</span>
          {titleEs && (
            <span className="text-xl text-ink/60 sm:text-2xl lg:text-3xl">
              {titleEs}
            </span>
          )}
        </h1>
        {totalPages > 1 && (
          <p className="font-body mt-2 text-base font-semibold uppercase tracking-widest text-blue/70 lg:text-lg">
            Page {pageNumber} of {totalPages} · Página {pageNumber} de{" "}
            {totalPages}
          </p>
        )}
      </motion.header>

      {/* Up to 4 tall vertical "slabs" side by side (they stack on mobile). The
          row is at least ~55vh tall (slab look) and GROWS to fit the longest
          card so no description is ever cut off; the cards stretch to equal
          height. Never scrolls or clips. */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-6 lg:grid-cols-4 lg:grid-rows-1 lg:gap-5 lg:min-h-[55vh]"
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
      <div aria-hidden="true" className="hidden lg:block lg:flex-1" />
    </InfoPageShell>
  );
}
