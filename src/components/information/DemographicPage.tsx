"use client";

import { motion } from "framer-motion";
import InfoPageShell from "./InfoPageShell";
import InfoEyebrow from "./InfoEyebrow";
import RotatingLeaf from "./RotatingLeaf";
import ExpandableServiceCard from "./ExpandableServiceCard";
import { staggerContainer, headerIn } from "./motion";
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
}: {
  content: InfoContent["demographic"];
}) {
  return (
    <InfoPageShell bg="teal">
      <div className="pointer-events-none absolute bottom-8 right-14 hidden lg:block">
        <RotatingLeaf size={150} className="text-paper/30" duration={24} />
      </div>

      <motion.header
        variants={headerIn}
        initial="hidden"
        animate="show"
        className="shrink-0"
      >
        <InfoEyebrow tone="ink" />
        <h1 className="font-display mt-1 flex flex-wrap items-baseline gap-x-4 leading-none">
          <span className="text-3xl sm:text-4xl lg:text-5xl">{content.heading}</span>
          {content.headingEs && (
            <span className="text-xl text-ink/60 sm:text-2xl lg:text-3xl">
              {content.headingEs}
            </span>
          )}
        </h1>
        <p className="font-body mt-2 max-w-5xl text-base font-medium sm:text-lg lg:text-xl">
          {content.intro}
        </p>
        {content.introEs && (
          <p className="font-body max-w-5xl text-sm font-medium text-ink/70 sm:text-base lg:text-lg">
            {content.introEs}
          </p>
        )}
      </motion.header>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="relative z-10 mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:grid-rows-2"
      >
        {content.services.map((s, i) => {
          return (
            <ExpandableServiceCard
              key={`${s.name}-${i}`}
              service={s}
              tone="paper"
              iconSize={28}
            />
          );
        })}
      </motion.div>
    </InfoPageShell>
  );
}
