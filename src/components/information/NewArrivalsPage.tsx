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
      <div className="pointer-events-none absolute bottom-10 right-14 hidden lg:block">
        <RotatingLeaf size={220} className="text-teal/25" duration={26} />
      </div>

      <motion.header
        variants={headerIn}
        initial="hidden"
        animate="show"
        className="shrink-0"
      >
        <InfoEyebrow tone="white" />
        <h1 className="font-display mt-4 text-7xl leading-[0.95] md:text-8xl">
          Welcome.
        </h1>
        <p className="font-body mt-4 max-w-4xl text-3xl font-medium text-paper/90 md:text-4xl">
          {newArrivals.intro}
        </p>
      </motion.header>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="relative z-10 mt-8 grid min-h-0 flex-1 grid-cols-1 gap-10 md:mt-10 lg:grid-cols-5 lg:gap-14"
      >
        <motion.section variants={riseItem} className="lg:col-span-3">
          <p className="font-body text-lg font-semibold uppercase tracking-[0.3em] md:text-xl">
            Where to start
          </p>
          <ol className="mt-6 space-y-6">
            {newArrivals.steps.map((step, i) => (
              <li key={step.title} className="flex items-baseline gap-6">
                <span className="font-display text-6xl leading-none text-paper/40 md:text-7xl">
                  {i + 1}
                </span>
                <div>
                  <p className="font-body text-3xl font-semibold md:text-4xl">
                    {step.title}
                  </p>
                  <p className="font-body mt-1 text-xl text-paper/80 md:text-2xl">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </motion.section>

        <motion.section
          variants={riseItem}
          className="flex flex-col bg-teal p-8 text-ink lg:col-span-2"
        >
          <p className="font-body text-lg font-semibold uppercase tracking-[0.3em] md:text-xl">
            Available now
          </p>
          <ul className="mt-5 space-y-4">
            {newArrivals.availableNow.map((item) => (
              <li
                key={item}
                className="font-body text-2xl font-semibold leading-tight md:text-3xl"
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
