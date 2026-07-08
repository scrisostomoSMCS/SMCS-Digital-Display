"use client";

import { motion } from "framer-motion";
import InfoPageShell from "./InfoPageShell";
import InfoEyebrow from "./InfoEyebrow";
import RotatingLeaf from "./RotatingLeaf";
import { staggerContainer, riseItem, headerIn } from "./motion";
import { newArrivals } from "@/lib/informationContent";

/*
  Page 2 — New arrivals. Full-bleed blue with a big warm Playfair welcome and
  Poppins supporting copy. Oversized ghost numbers lead the steps; a solid teal
  panel holds what's available now. A large signature leaf sits in the empty
  space. Everything stays white for readability on blue.
*/
export default function NewArrivalsPage() {
  return (
    <InfoPageShell bg="blue">
      {/* Ambient signature leaf in the deliberate empty space. */}
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
        <h1 className="font-display mt-2 text-6xl leading-[0.95] md:text-7xl">
          {newArrivals.headline}
        </h1>
        <p className="font-body mt-3 max-w-4xl text-2xl font-medium text-paper/90 md:text-3xl">
          {newArrivals.intro}
        </p>
      </motion.header>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="relative z-10 mt-6 grid min-h-0 flex-1 grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-12"
      >
        <motion.section variants={riseItem} className="min-h-0 lg:col-span-3">
          <p className="font-body text-base font-semibold uppercase tracking-[0.3em] md:text-lg">
            {newArrivals.stepsLabel}
          </p>
          <ol className="mt-4 space-y-4">
            {newArrivals.steps.map((step, i) => (
              <li key={step.title} className="flex items-baseline gap-5">
                <span className="font-display text-5xl leading-none text-paper/40 md:text-6xl">
                  {i + 1}
                </span>
                <div>
                  <p className="font-body text-2xl font-semibold md:text-3xl">
                    {step.title}
                  </p>
                  <p className="font-body mt-1 text-lg text-paper/80 md:text-xl">
                    {step.detail}
                  </p>
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
            {newArrivals.availableLabel}
          </p>
          <ul className="mt-4 space-y-3">
            {newArrivals.availableNow.map((item) => (
              <li
                key={item}
                className="font-body text-xl font-semibold leading-tight md:text-2xl"
              >
                {item}
              </li>
            ))}
          </ul>
        </motion.section>
      </motion.div>
    </InfoPageShell>
  );
}
