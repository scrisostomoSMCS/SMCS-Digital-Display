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

  Bilingual: the headline stays inline; longer English and Spanish copy uses
  paired columns so both languages fit without being clipped.
*/
export default function NewArrivalsPage({
  content,
}: {
  content: InfoContent["newArrivals"];
}) {
  const availableEs = content.availableNowEs ?? [];

  return (
    <InfoPageShell bg="blue">
      <div className="pointer-events-none absolute bottom-8 right-12 hidden @min-[64rem]:block">
        <RotatingLeaf size={190} className="text-teal/25" duration={26} />
      </div>

      <motion.header
        variants={headerIn}
        initial="hidden"
        animate="show"
        className="shrink-0"
      >
        <InfoEyebrow tone="white" />
        <h1 className="font-display mt-1 max-w-[76%] flex flex-wrap items-baseline gap-x-4 leading-[0.95]">
          <span className="text-4xl @min-[40rem]:text-5xl @min-[64rem]:text-7xl">{content.headline}</span>
          {content.headlineEs && (
            <span className="text-3xl text-paper/75 @min-[40rem]:text-3xl @min-[64rem]:text-5xl">
              {content.headlineEs}
            </span>
          )}
        </h1>
        <div className="mt-2 grid max-w-6xl gap-x-10 gap-y-1 @min-[64rem]:grid-cols-2">
          <p className="font-body text-2xl font-medium text-paper/90 @min-[40rem]:text-2xl @min-[64rem]:text-3xl">
            {content.intro}
          </p>
          {content.introEs && (
            // Nudged down on the wall display only: the live bed panel floats
            // over the top-right corner and would clip this column's first line.
            // The padding is cancelled by an equal negative bottom margin so the
            // row does not grow -- the steps list and the "Available Now" panel
            // below stay exactly where they were. Tighter leading buys the space
            // the shift needs without the last line reaching the teal panel.
            <p className="font-body text-xl font-medium text-paper/70 @min-[40rem]:text-2xl @min-[64rem]:-mb-8 @min-[64rem]:pt-8 @min-[64rem]:text-3xl @min-[64rem]:leading-[1.3]">
              {content.introEs}
            </p>
          )}
        </div>
      </motion.header>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="relative z-10 mt-5 grid grid-cols-1 gap-8 @min-[64rem]:min-h-0 @min-[64rem]:flex-1 @min-[64rem]:grid-cols-5 @min-[64rem]:gap-10"
      >
        <motion.section
          variants={riseItem}
          className="min-h-0 @min-[64rem]:col-span-3"
        >
          <p className="font-body text-xl font-semibold uppercase tracking-[0.3em] @min-[64rem]:text-2xl">
            {content.stepsLabel}
            {content.stepsLabelEs && (
              <span className="text-paper/70"> · {content.stepsLabelEs}</span>
            )}
          </p>
          <ol className="mt-4 space-y-5">
            {content.steps.map((step, i) => (
              <li key={`${step.title}-${i}`} className="flex items-start gap-4">
                <span className="font-display text-5xl leading-none text-paper/40 @min-[64rem]:text-6xl">
                  {i + 1}
                </span>
                <div
                  className={`grid min-w-0 flex-1 gap-x-6 gap-y-1 ${
                    step.titleEs || step.detailEs ? "@min-[64rem]:grid-cols-2" : ""
                  }`}
                >
                  <div className="min-w-0 break-words">
                    <p className="font-body text-2xl font-semibold @min-[40rem]:text-3xl">
                      {step.title}
                    </p>
                    <p className="font-body mt-0.5 text-xl text-paper/80 @min-[40rem]:text-2xl">
                      {step.detail}
                    </p>
                  </div>
                  {(step.titleEs || step.detailEs) && (
                    <div className="min-w-0 break-words border-l-2 border-paper/25 pl-4">
                      {step.titleEs && (
                        <p className="font-body text-2xl font-medium text-paper/75 @min-[40rem]:text-2xl @min-[64rem]:text-3xl">
                          {step.titleEs}
                        </p>
                      )}
                      {step.detailEs && (
                        <p className="font-body mt-0.5 text-xl text-paper/60 @min-[64rem]:text-2xl">
                          {step.detailEs}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </motion.section>

        <motion.section
          variants={riseItem}
          className="flex min-h-0 flex-col bg-teal p-6 text-ink @min-[64rem]:col-span-2"
        >
          <p className="font-body text-xl font-semibold uppercase tracking-[0.3em] @min-[64rem]:text-2xl">
            {content.availableLabel}
            {content.availableLabelEs && (
              <span className="text-ink/60"> · {content.availableLabelEs}</span>
            )}
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 @min-[64rem]:grid-cols-2">
            {content.availableNow.map((item, i) => (
              <li
                key={`${item}-${i}`}
                className="font-body min-w-0 break-words leading-tight"
              >
                <span className="block text-2xl font-semibold @min-[64rem]:text-3xl">
                  {item}
                </span>
                {availableEs[i] && (
                  <span className="mt-0.5 block text-xl font-medium text-ink/70 @min-[64rem]:text-2xl">
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
