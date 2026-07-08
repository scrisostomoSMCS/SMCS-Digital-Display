"use client";

import { motion } from "framer-motion";
import InfoPageShell from "./InfoPageShell";
import InfoEyebrow from "./InfoEyebrow";
import RotatingLeaf from "./RotatingLeaf";
import { staggerContainer, riseItem, headerIn } from "./motion";
import { featuredDemographic } from "@/lib/informationContent";

/*
  Page 3 — demographic focus (currently expecting mothers). Full-bleed teal for
  a distinct, warm identity; Playfair title, Poppins body, relevant services in
  crisp white cards that stagger in. A large signature leaf fills the open
  corner. Reads the featured demographic from content, so it's easy to swap.
*/
export default function DemographicPage() {
  const d = featuredDemographic;
  return (
    <InfoPageShell bg="teal">
      {/* Ambient signature leaf in the open corner. */}
      <div className="pointer-events-none absolute bottom-10 right-16 hidden lg:block">
        <RotatingLeaf size={200} className="text-paper/30" duration={24} />
      </div>

      <motion.header
        variants={headerIn}
        initial="hidden"
        animate="show"
        className="shrink-0"
      >
        <InfoEyebrow tone="ink" />
        <h1 className="font-display mt-3 text-5xl leading-none md:text-7xl">
          {d.heading}
        </h1>
        <p className="font-body mt-4 max-w-4xl text-2xl font-medium md:text-3xl">
          {d.intro}
        </p>
      </motion.header>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="relative z-10 mt-7 grid min-h-0 flex-1 grid-cols-2 gap-4 md:mt-8 lg:grid-cols-3 lg:gap-5"
      >
        {d.services.map((s) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.name}
              variants={riseItem}
              className="flex flex-col bg-paper px-6 py-5 text-ink"
            >
              <div className="flex items-center gap-3 text-blue">
                {Icon && <Icon size={36} strokeWidth={2} aria-hidden="true" />}
                <h2 className="font-body text-2xl font-semibold leading-tight md:text-3xl">
                  {s.name}
                </h2>
              </div>
              <p className="font-body mt-3 text-xl font-semibold md:text-2xl">
                {s.schedule}
              </p>
              <p className="font-body mt-2 text-lg md:text-xl">
                {s.description}
              </p>
              {s.location && (
                <p className="font-body mt-auto pt-3 text-base font-semibold uppercase tracking-widest text-ink/60 md:text-lg">
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
