"use client";

import { motion } from "framer-motion";
import InfoPageShell from "./InfoPageShell";
import InfoEyebrow from "./InfoEyebrow";
import { staggerContainer, riseItem, headerIn } from "./motion";
import { weeklyServices } from "@/lib/informationContent";

/*
  Page 1 — Services overview. Playfair title, Poppins service text, an energetic
  checkerboard of solid blue/teal cards (with lucide icons) that stagger in via
  Framer Motion. High contrast: white text on blue, black on teal.
*/
export default function ServicesOverviewPage() {
  return (
    <InfoPageShell bg="paper">
      <motion.header
        variants={headerIn}
        initial="hidden"
        animate="show"
        className="shrink-0"
      >
        <InfoEyebrow tone="blue" />
        <h1 className="font-display mt-3 text-6xl leading-none md:text-8xl">
          This Week&rsquo;s Services
        </h1>
      </motion.header>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mt-8 grid min-h-0 flex-1 grid-cols-2 gap-4 md:mt-10 lg:grid-cols-3 lg:gap-5"
      >
        {weeklyServices.map((s, i) => {
          const blue = i % 2 === 0;
          const Icon = s.icon;
          return (
            <motion.div
              key={s.name}
              variants={riseItem}
              className={`flex flex-col px-6 py-5 ${
                blue ? "bg-blue text-paper" : "bg-teal text-ink"
              }`}
            >
              <div className="flex items-center gap-3">
                {Icon && <Icon size={40} strokeWidth={2} aria-hidden="true" />}
                <h2 className="font-body text-3xl font-semibold leading-tight md:text-4xl">
                  {s.name}
                </h2>
              </div>
              <p className="font-body mt-3 text-2xl font-semibold md:text-3xl">
                {s.schedule}
              </p>
              <p
                className={`font-body mt-2 text-lg md:text-2xl ${
                  blue ? "text-paper/90" : "text-ink/90"
                }`}
              >
                {s.description}
              </p>
              {s.location && (
                <p
                  className={`font-body mt-auto pt-3 text-base font-semibold uppercase tracking-widest md:text-lg ${
                    blue ? "text-paper/80" : "text-ink/70"
                  }`}
                >
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
