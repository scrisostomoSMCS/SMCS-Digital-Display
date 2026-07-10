"use client";

import { motion } from "framer-motion";
import InfoPageShell from "./InfoPageShell";
import InfoEyebrow from "./InfoEyebrow";
import RotatingLeaf from "./RotatingLeaf";
import { staggerContainer, riseItem, headerIn } from "./motion";
import type { Slide } from "@/lib/slides";

// Backgrounds cycle so consecutive custom slides feel distinct but on-brand.
const BG = ["blue", "teal", "paper"] as const;

/*
  Renders an employee-created slide in the established style: Playfair title,
  Poppins body/items, brand colors, rotating leaf. The employee supplies only
  content; everything here is styling, so the rotation stays cohesive.
*/
export default function CustomSlidePage({
  slide,
  index,
}: {
  slide: Slide;
  index: number;
}) {
  const bg = BG[index % BG.length];
  const eyebrowTone = bg === "blue" ? "white" : bg === "teal" ? "ink" : "blue";
  const leafColor = bg === "teal" ? "text-paper/30" : "text-teal/25";
  const marker = bg === "teal" ? "bg-blue" : "bg-teal";

  return (
    <InfoPageShell bg={bg}>
      <div className="pointer-events-none absolute bottom-8 right-14 hidden lg:block">
        <RotatingLeaf size={160} className={leafColor} duration={25} />
      </div>

      <motion.header
        variants={headerIn}
        initial="hidden"
        animate="show"
        className="shrink-0"
      >
        <InfoEyebrow tone={eyebrowTone} />
        <h1 className="font-display mt-2 text-5xl leading-none md:text-7xl">
          {slide.title}
        </h1>
      </motion.header>

      <div className="relative z-10 mt-6 flex min-h-0 flex-1 flex-col">
        {slide.body && (
          <motion.p
            variants={riseItem}
            initial="hidden"
            animate="show"
            className="font-body max-w-5xl text-2xl font-medium md:text-3xl"
          >
            {slide.body}
          </motion.p>
        )}

        {slide.items.length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            {slide.items.map((item, i) => (
              <motion.div
                key={i}
                variants={riseItem}
                className="font-body flex items-center gap-4 text-2xl font-semibold md:text-3xl"
              >
                <span
                  className={`h-4 w-4 shrink-0 ${marker}`}
                  aria-hidden="true"
                />
                {item}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </InfoPageShell>
  );
}
