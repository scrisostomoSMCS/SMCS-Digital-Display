"use client";

import { motion } from "framer-motion";
import InfoPageShell from "./InfoPageShell";
import InfoEyebrow from "./InfoEyebrow";
import { staggerContainer, riseItem, headerIn } from "./motion";
import {
  iconFromKey,
  serviceIconFor,
  type InfoContent,
} from "@/lib/infoContent";

/*
  Page 1, Services overview. Content-driven (edited on the manage page). A
  service's `time` may hold several lines (e.g. meal times), split on newlines.
  Icons are looked up by name. Fixed 3×2 grid so all cards fit on screen.
  Bilingual: Spanish name/description sit beneath their English counterparts,
  smaller and lighter, and only when a Spanish value exists.
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
        <h1 className="font-display mt-2 text-5xl leading-none md:text-6xl">
          {content.title}
        </h1>
        {content.titleEs && (
          <p className="font-display mt-1 text-3xl leading-tight text-ink/70 md:text-4xl">
            {content.titleEs}
          </p>
        )}
      </motion.header>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mt-5 grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-4"
      >
        {content.items.map((s, i) => {
          const blue = i % 2 === 0;
          // Prefer the saved icon key; fall back to name lookup for content
          // saved before icons were editable.
          const Icon = iconFromKey(s.icon) ?? serviceIconFor(s.name);
          return (
            <motion.div
              key={`${s.name}-${i}`}
              variants={riseItem}
              className={`flex min-h-0 flex-col px-6 py-4 ${
                blue ? "bg-blue text-paper" : "bg-teal text-ink"
              }`}
            >
              <div className="flex items-center gap-3">
                {Icon && <Icon size={34} strokeWidth={2} aria-hidden="true" />}
                <div>
                  <h2 className="font-body text-2xl font-semibold leading-tight md:text-3xl">
                    {s.name}
                  </h2>
                  {s.nameEs && (
                    <p
                      className={`font-body text-lg font-semibold leading-tight md:text-xl ${
                        blue ? "text-paper/80" : "text-ink/70"
                      }`}
                    >
                      {s.nameEs}
                    </p>
                  )}
                </div>
              </div>
              {s.time && (
                <div className="font-body mt-2 space-y-0.5 text-xl font-semibold md:text-2xl">
                  {s.time.split("\n").map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              )}
              {s.description && (
                <p
                  className={`font-body mt-1 text-base md:text-lg ${
                    blue ? "text-paper/90" : "text-ink/90"
                  }`}
                >
                  {s.description}
                </p>
              )}
              {s.descriptionEs && (
                <p
                  className={`font-body mt-0.5 text-sm md:text-base ${
                    blue ? "text-paper/70" : "text-ink/70"
                  }`}
                >
                  {s.descriptionEs}
                </p>
              )}
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
