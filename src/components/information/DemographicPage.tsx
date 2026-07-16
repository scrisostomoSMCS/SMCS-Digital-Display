"use client";

import { motion } from "framer-motion";
import InfoPageShell from "./InfoPageShell";
import InfoEyebrow from "./InfoEyebrow";
import RotatingLeaf from "./RotatingLeaf";
import { staggerContainer, riseItem, headerIn } from "./motion";
import {
  iconFromKey,
  serviceIconFor,
  type InfoContent,
} from "@/lib/infoContent";

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
        className="relative z-10 mt-4 grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto pb-2 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 lg:overflow-visible lg:pb-0"
      >
        {content.services.map((s, i) => {
          const Icon = iconFromKey(s.icon) ?? serviceIconFor(s.name);
          return (
            <motion.div
              key={`${s.name}-${i}`}
              variants={riseItem}
              className="flex min-h-0 flex-col overflow-visible bg-paper p-4 text-ink lg:overflow-hidden lg:px-5 lg:py-3"
            >
              <div className="flex items-start gap-3 text-blue">
                {Icon && (
                  <Icon
                    size={28}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="mt-1 shrink-0"
                  />
                )}
                <h2 className="font-body text-xl font-semibold leading-tight lg:text-2xl">
                  {s.name}
                  {s.nameEs && (
                    <span className="font-medium text-blue/65"> / {s.nameEs}</span>
                  )}
                </h2>
              </div>
              {s.time && (
                <div className="font-body mt-1.5 space-y-0.5 text-lg font-semibold lg:text-xl">
                  {s.time.split("\n").map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              )}
              {s.description && (
                <p className="font-body mt-1 text-sm lg:text-base">
                  {s.description}
                </p>
              )}
              {s.descriptionEs && (
                <p className="font-body text-xs text-ink/70 lg:text-sm">
                  {s.descriptionEs}
                </p>
              )}
              {s.location && (
                <p className="font-body mt-auto pt-1.5 text-xs font-semibold uppercase tracking-widest text-ink/60 lg:text-sm">
                  {s.location}
                </p>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </InfoPageShell>
  );
}
