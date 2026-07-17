"use client";

import { motion } from "framer-motion";
import InfoPageShell from "./InfoPageShell";
import InfoEyebrow from "./InfoEyebrow";
import ExpandableServiceCard from "./ExpandableServiceCard";
import { staggerContainer, headerIn } from "./motion";
import { type InfoContent } from "@/lib/infoContent";

/*
  Page 1, Services overview. Content-driven (edited on the manage page). A
  service's `time` may hold several lines (e.g. meal times), split on newlines.
  Icons are looked up by name. Fixed 3×2 grid so all cards fit on screen.

  Bilingual: the Spanish name sits inline beside the English name (saves height),
  and the Spanish description sits beneath the English one, smaller and lighter.
  Cards clip (overflow-hidden) so content can never spill past their edges.
*/
export default function ServicesOverviewPage({
  content,
}: {
  content: InfoContent["services"];
}) {
  return (
    <InfoPageShell bg="paper">
      <motion.header
        variants={headerIn}
        initial="hidden"
        animate="show"
        className="shrink-0"
      >
        <InfoEyebrow tone="blue" />
        <h1 className="font-display mt-1 flex flex-wrap items-baseline gap-x-4 leading-none">
          <span className="text-3xl sm:text-4xl lg:text-5xl">{content.title}</span>
          {content.titleEs && (
            <span className="text-xl text-ink/60 sm:text-2xl lg:text-3xl">
              {content.titleEs}
            </span>
          )}
        </h1>
      </motion.header>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-cols-3 lg:grid-rows-2"
      >
        {content.items.map((s, i) => {
          const blue = i % 2 === 0;
          return (
            <ExpandableServiceCard
              key={`${s.name}-${i}`}
              service={s}
              tone={blue ? "blue" : "teal"}
            />
          );
        })}
      </motion.div>
    </InfoPageShell>
  );
}
