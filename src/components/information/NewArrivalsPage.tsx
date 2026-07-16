"use client";

import { motion } from "framer-motion";
import InfoPageShell from "./InfoPageShell";
import InfoEyebrow from "./InfoEyebrow";
import RotatingLeaf from "./RotatingLeaf";
import { staggerContainer, riseItem, headerIn } from "./motion";
import type { InfoContent } from "@/lib/infoContent";

/*
  Page 2, New arrivals. Content-driven (edited on the manage page). Full-bleed
  blue with a big warm Playfair welcome and Poppins supporting copy. A large
  signature leaf sits in the empty space. Bilingual: Spanish sits beneath the
  English throughout (headline, message, steps, and the "available now" list).
*/
export default function NewArrivalsPage({
  content,
}: {
  content: InfoContent["newArrivals"];
}) {
  const availableEs = content.availableNowEs ?? [];

  return (
    <InfoPageShell bg="blue">
      <div className="pointer-events-none absolute bottom-8 right-12 hidden lg:block">
        <RotatingLeaf size={170} className="text-teal/25" duration={26} />
      </div>

      <motion.header
        variants={headerIn}
        initial="hidden"
        animate="show"
        className="shrink-0"
      >
        <InfoEyebrow tone="white" />
        <h1 className="font-display mt-2 text-5xl leading-[0.95] md:text-7xl">
          {content.headline}
        </h1>
        {content.headlineEs && (
          <p className="font-display mt-1 text-4xl leading-[0.95] text-paper/80 md:text-5xl">
            {content.headlineEs}
          </p>
        )}
        <p className="font-body mt-3 max-w-4xl text-2xl font-medium text-paper/90 md:text-3xl">
          {content.intro}
        </p>
        {content.introEs && (
          <p className="font-body mt-1 max-w-4xl text-xl font-medium text-paper/70 md:text-2xl">
            {content.introEs}
          </p>
        )}
      </motion.header>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="relative z-10 mt-6 grid min-h-0 flex-1 grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-12"
      >
        <motion.section variants={riseItem} className="min-h-0 lg:col-span-3">
          <p className="font-body text-base font-semibold uppercase tracking-[0.3em] md:text-lg">
            {content.stepsLabel}
            {content.stepsLabelEs && (
              <span className="text-paper/70"> · {content.stepsLabelEs}</span>
            )}
          </p>
          <ol className="mt-4 space-y-4">
            {content.steps.map((step, i) => (
              <li key={`${step.title}-${i}`} className="flex items-baseline gap-5">
                <span className="font-display text-5xl leading-none text-paper/40 md:text-6xl">
                  {i + 1}
                </span>
                <div>
                  <p className="font-body text-2xl font-semibold md:text-3xl">
                    {step.title}
                  </p>
                  {step.titleEs && (
                    <p className="font-body text-xl font-semibold text-paper/75 md:text-2xl">
                      {step.titleEs}
                    </p>
                  )}
                  <p className="font-body mt-1 text-lg text-paper/80 md:text-xl">
                    {step.detail}
                  </p>
                  {step.detailEs && (
                    <p className="font-body text-base text-paper/60 md:text-lg">
                      {step.detailEs}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </motion.section>

        <motion.section
          variants={riseItem}
          className="flex min-h-0 flex-col bg-teal p-7 text-ink lg:col-span-2"
        >
          <p className="font-body text-base font-semibold uppercase tracking-[0.3em] md:text-lg">
            {content.availableLabel}
            {content.availableLabelEs && (
              <span className="text-ink/60"> · {content.availableLabelEs}</span>
            )}
          </p>
          <ul className="mt-4 space-y-3">
            {content.availableNow.map((item, i) => (
              <li key={`${item}-${i}`} className="font-body leading-tight">
                <span className="block text-xl font-semibold md:text-2xl">
                  {item}
                </span>
                {availableEs[i] && (
                  <span className="block text-lg font-medium text-ink/70 md:text-xl">
                    {availableEs[i]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </motion.section>
      </motion.div>
    </InfoPageShell>
  );
}
