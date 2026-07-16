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
  leaf. Fixed 3×2 grid so nothing is cut off. Bilingual: Spanish sits beneath
  the English (heading, intro, and each card's name/description).
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
        <h1 className="font-display mt-2 text-4xl leading-none md:text-6xl">
          {content.heading}
        </h1>
        {content.headingEs && (
          <p className="font-display mt-1 text-3xl leading-tight text-ink/70 md:text-4xl">
            {content.headingEs}
          </p>
        )}
        <p className="font-body mt-3 max-w-4xl text-xl font-medium md:text-2xl">
          {content.intro}
        </p>
        {content.introEs && (
          <p className="font-body mt-1 max-w-4xl text-lg font-medium text-ink/70 md:text-xl">
            {content.introEs}
          </p>
        )}
      </motion.header>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="relative z-10 mt-5 grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-4"
      >
        {content.services.map((s, i) => {
          const Icon = iconFromKey(s.icon) ?? serviceIconFor(s.name);
          return (
            <motion.div
              key={`${s.name}-${i}`}
              variants={riseItem}
              className="flex min-h-0 flex-col bg-paper px-6 py-4 text-ink"
            >
              <div className="flex items-center gap-3 text-blue">
                {Icon && <Icon size={30} strokeWidth={2} aria-hidden="true" />}
                <div>
                  <h2 className="font-body text-xl font-semibold leading-tight md:text-2xl">
                    {s.name}
                  </h2>
                  {s.nameEs && (
                    <p className="font-body text-base font-semibold leading-tight text-blue/70 md:text-lg">
                      {s.nameEs}
                    </p>
                  )}
                </div>
              </div>
              {s.time && (
                <div className="font-body mt-2 space-y-0.5 text-lg font-semibold md:text-xl">
                  {s.time.split("\n").map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              )}
              {s.description && (
                <p className="font-body mt-1 text-base md:text-lg">
                  {s.description}
                </p>
              )}
              {s.descriptionEs && (
                <p className="font-body mt-0.5 text-sm text-ink/70 md:text-base">
                  {s.descriptionEs}
                </p>
              )}
              {s.location && (
                <p className="font-body mt-auto pt-2 text-sm font-semibold uppercase tracking-widest text-ink/60 md:text-base">
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
