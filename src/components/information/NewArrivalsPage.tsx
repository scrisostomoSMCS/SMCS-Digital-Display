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
  signature leaf sits in the empty space.

  Bilingual: Spanish sits beneath the English throughout (headline inline,
  message/steps/available-now beneath), a step smaller and lighter. Columns clip
  so the two languages stay contained.
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
        <RotatingLeaf size={150} className="text-teal/25" duration={26} />
      </div>

      <motion.header
        variants={headerIn}
        initial="hidden"
        animate="show"
        className="shrink-0"
      >
        <InfoEyebrow tone="white" />
        <h1 className="font-display mt-1 flex flex-wrap items-baseline gap-x-4 leading-[0.95]">
          <span className="text-5xl md:text-6xl">{content.headline}</span>
          {content.headlineEs && (
            <span className="text-3xl text-paper/75 md:text-4xl">
              {content.headlineEs}
            </span>
          )}
        </h1>
        <p className="font-body mt-2 max-w-4xl text-xl font-medium text-paper/90 md:text-2xl">
          {content.intro}
        </p>
        {content.introEs && (
          <p className="font-body max-w-4xl text-lg font-medium text-paper/70 md:text-xl">
            {content.introEs}
          </p>
        )}
      </motion.header>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="relative z-10 mt-5 grid min-h-0 flex-1 grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-12"
      >
        <motion.section
          variants={riseItem}
          className="min-h-0 overflow-hidden lg:col-span-3"
        >
          <p className="font-body text-sm font-semibold uppercase tracking-[0.3em] md:text-base">
            {content.stepsLabel}
            {content.stepsLabelEs && (
              <span className="text-paper/70"> · {content.stepsLabelEs}</span>
            )}
          </p>
          <ol className="mt-3 space-y-3">
            {content.steps.map((step, i) => (
              <li key={`${step.title}-${i}`} className="flex items-baseline gap-4">
                <span className="font-display text-4xl leading-none text-paper/40 md:text-5xl">
                  {i + 1}
                </span>
                <div>
                  <p className="font-body text-xl font-semibold md:text-2xl">
                    {step.title}
                    {step.titleEs && (
                      <span className="font-medium text-paper/75">
                        {" "}
                        / {step.titleEs}
                      </span>
                    )}
                  </p>
                  <p className="font-body mt-0.5 text-base text-paper/80 md:text-lg">
                    {step.detail}
                  </p>
                  {step.detailEs && (
                    <p className="font-body text-sm text-paper/60 md:text-base">
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
          className="flex min-h-0 flex-col overflow-hidden bg-teal p-6 text-ink lg:col-span-2"
        >
          <p className="font-body text-sm font-semibold uppercase tracking-[0.3em] md:text-base">
            {content.availableLabel}
            {content.availableLabelEs && (
              <span className="text-ink/60"> · {content.availableLabelEs}</span>
            )}
          </p>
          <ul className="mt-3 space-y-2.5">
            {content.availableNow.map((item, i) => (
              <li key={`${item}-${i}`} className="font-body leading-tight">
                <span className="block text-lg font-semibold md:text-xl">
                  {item}
                </span>
                {availableEs[i] && (
                  <span className="block text-base font-medium text-ink/70 md:text-lg">
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
