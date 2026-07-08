"use client";

import { motion } from "framer-motion";
import InfoPageShell from "./InfoPageShell";
import InfoEyebrow from "./InfoEyebrow";
import { staggerContainer, riseItem, headerIn } from "./motion";
import { servicesPage, weeklyServices } from "@/lib/informationContent";

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
        <h1 className="font-display mt-2 text-5xl leading-none md:text-6xl">
          {servicesPage.title}
        </h1>
      </motion.header>

      {/* Fixed 3×2 grid that fills the remaining height, so all six cards fit
          on-screen with nothing cut off. */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mt-5 grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-4"
      >
        {weeklyServices.map((s, i) => {
          const blue = i % 2 === 0;
          const Icon = s.icon;
          return (
            <motion.div
              key={s.name}
              variants={riseItem}
              className={`flex min-h-0 flex-col px-6 py-4 ${
                blue ? "bg-blue text-paper" : "bg-teal text-ink"
              }`}
            >
              <div className="flex items-center gap-3">
                {Icon && <Icon size={34} strokeWidth={2} aria-hidden="true" />}
                <h2 className="font-body text-2xl font-semibold leading-tight md:text-3xl">
                  {s.name}
                </h2>
              </div>
              <p className="font-body mt-2 text-xl font-semibold md:text-2xl">
                {s.schedule}
              </p>
              <p
                className={`font-body mt-1 text-base md:text-lg ${
                  blue ? "text-paper/90" : "text-ink/90"
                }`}
              >
                {s.description}
              </p>
              {s.location && (
                <p
                  className={`font-body mt-auto pt-2 text-sm font-semibold uppercase tracking-widest md:text-base ${
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
