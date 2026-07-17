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
  paired columns on bulletin-sized screens so both languages fit without being
  clipped. Smaller screens can scroll the content region when needed.
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
          <span className="text-3xl sm:text-4xl lg:text-6xl">{content.headline}</span>
          {content.headlineEs && (
            <span className="text-xl text-paper/75 sm:text-2xl lg:text-4xl">
              {content.headlineEs}
            </span>
          )}
        </h1>
        <div className="mt-2 grid max-w-6xl gap-x-10 gap-y-1 lg:grid-cols-2">
          <p className="font-body text-base font-medium text-paper/90 sm:text-lg lg:text-2xl">
            {content.intro}
          </p>
          {content.introEs && (
            <p className="font-body text-sm font-medium text-paper/70 sm:text-base lg:text-xl">
              {content.introEs}
            </p>
          )}
        </div>
      </motion.header>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="relative z-10 mt-4 grid grid-cols-1 gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-5 lg:gap-8"
      >
        <motion.section
          variants={riseItem}
          className="min-h-0 lg:col-span-3"
        >
          <p className="font-body text-sm font-semibold uppercase tracking-[0.3em] lg:text-base">
            {content.stepsLabel}
            {content.stepsLabelEs && (
              <span className="text-paper/70"> · {content.stepsLabelEs}</span>
            )}
          </p>
          <ol className="mt-3 space-y-3">
            {content.steps.map((step, i) => (
              <li key={`${step.title}-${i}`} className="flex items-start gap-4">
                <span className="font-display text-4xl leading-none text-paper/40 lg:text-5xl">
                  {i + 1}
                </span>
                <div
                  className={`grid min-w-0 flex-1 gap-x-6 gap-y-1 ${
                    step.titleEs || step.detailEs ? "lg:grid-cols-2" : ""
                  }`}
                >
                  <div className="min-w-0 break-words">
                    <p className="font-body text-lg font-semibold sm:text-xl lg:text-2xl">
                      {step.title}
                    </p>
                    <p className="font-body mt-0.5 text-sm text-paper/80 sm:text-base lg:text-lg">
                      {step.detail}
                    </p>
                  </div>
                  {(step.titleEs || step.detailEs) && (
                    <div className="min-w-0 break-words border-l-2 border-paper/25 pl-4">
                      {step.titleEs && (
                        <p className="font-body text-base font-medium text-paper/75 sm:text-lg lg:text-xl">
                          {step.titleEs}
                        </p>
                      )}
                      {step.detailEs && (
                        <p className="font-body mt-0.5 text-sm text-paper/60 lg:text-base">
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
          className="flex min-h-0 flex-col bg-teal p-5 text-ink lg:col-span-2"
        >
          <p className="font-body text-sm font-semibold uppercase tracking-[0.3em] lg:text-base">
            {content.availableLabel}
            {content.availableLabelEs && (
              <span className="text-ink/60"> · {content.availableLabelEs}</span>
            )}
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-x-5 gap-y-3 lg:grid-cols-2">
            {content.availableNow.map((item, i) => (
              <li
                key={`${item}-${i}`}
                className="font-body min-w-0 break-words leading-tight"
              >
                <span className="block text-lg font-semibold lg:text-xl">
                  {item}
                </span>
                {availableEs[i] && (
                  <span className="mt-0.5 block text-sm font-medium text-ink/70 lg:text-base">
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
