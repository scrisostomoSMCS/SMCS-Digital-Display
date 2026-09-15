"use client";

import { motion } from "framer-motion";
import InfoPageShell from "./InfoPageShell";
import InfoEyebrow from "./InfoEyebrow";
import RotatingLeaf from "./RotatingLeaf";
import ExpandableServiceCard from "./ExpandableServiceCard";
import { staggerContainer, headerIn } from "./motion";
import { BED_PANEL_CLEARANCE } from "@/components/BedAvailabilitySlide";
import { type InfoContent } from "@/lib/infoContent";

/*
  Page 3, demographic focus (currently expecting mothers). Content-driven
  (edited on the manage page). Full-bleed teal, white icon cards, large corner
  leaf. Fixed 3×2 grid so nothing is cut off.

  Bilingual: Spanish heading sits inline beside the English heading; the Spanish
  intro and each card's Spanish name/description sit beneath, smaller and
  lighter. Cards clip so content can never spill past their edges.
*/
export default function DemographicPage({
  content,
  animate = true,
}: {
  content: InfoContent["demographic"];
  // false renders the finished state with no entrance animation, for the
  // manage page's static preview.
  animate?: boolean;
}) {
  const init = animate ? "hidden" : false;
  return (
    <InfoPageShell bg="teal">
      <div className="pointer-events-none absolute bottom-8 right-14 hidden @min-[64rem]:block">
        <RotatingLeaf size={190} className="text-paper/30" duration={24} />
      </div>

      <motion.header
        variants={headerIn}
        initial={init}
        animate="show"
        className={`shrink-0 ${BED_PANEL_CLEARANCE}`}
      >
        <InfoEyebrow bg="teal" />
        <h1 className="font-display mt-1 max-w-[68%] flex flex-wrap items-baseline gap-x-4 leading-none">
          <span className="text-4xl @min-[40rem]:text-5xl @min-[64rem]:text-6xl">{content.heading}</span>
          {content.headingEs && (
            <span className="text-3xl text-ink/60 @min-[40rem]:text-3xl @min-[64rem]:text-4xl">
              {content.headingEs}
            </span>
          )}
        </h1>
        <p className="font-body mt-2 max-w-5xl text-2xl font-medium @min-[40rem]:text-2xl @min-[64rem]:text-3xl">
          {content.intro}
        </p>
        {content.introEs && (
          <p className="font-body max-w-5xl text-xl font-medium text-ink/70 @min-[40rem]:text-2xl">
            {content.introEs}
          </p>
        )}
      </motion.header>

      <motion.div
        variants={staggerContainer}
        initial={init}
        animate="show"
        className="relative z-10 mt-5 grid grid-cols-1 gap-4 @min-[40rem]:grid-cols-2 @min-[64rem]:min-h-0 @min-[64rem]:flex-1 @min-[64rem]:grid-cols-3 @min-[64rem]:grid-rows-2"
      >
        {content.services.map((s, i) => {
          return (
            <ExpandableServiceCard
              key={`${s.name}-${i}`}
              service={s}
              tone="paper"
              iconSize={38}
            />
          );
        })}
      </motion.div>
    </InfoPageShell>
  );
}
