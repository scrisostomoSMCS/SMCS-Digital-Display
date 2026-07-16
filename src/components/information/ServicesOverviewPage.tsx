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
        className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto pb-2 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 lg:overflow-visible lg:pb-0"
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
              className={`flex min-h-0 flex-col overflow-visible p-4 lg:overflow-hidden lg:px-5 lg:py-3 ${
                blue ? "bg-blue text-paper" : "bg-teal text-ink"
              }`}
            >
              <div className="flex items-start gap-3">
                {Icon && (
                  <Icon
                    size={30}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="mt-1 shrink-0"
                  />
                )}
                <h2 className="font-body text-xl font-semibold leading-tight lg:text-2xl">
                  {s.name}
                  {s.nameEs && (
                    <span
                      className={`font-medium ${
                        blue ? "text-paper/75" : "text-ink/65"
                      }`}
                    >
                      {" "}
                      / {s.nameEs}
                    </span>
                  )}
                </h2>
              </div>
              {s.time && (
                <div className="font-body mt-1.5 space-y-0.5 text-lg font-semibold lg:text-xl">
                  {s.time.split("\n").map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              )}
              {s.description && (
                <p
                  className={`font-body mt-1 text-sm lg:text-base ${
                    blue ? "text-paper/90" : "text-ink/90"
                  }`}
                >
                  {s.description}
                </p>
              )}
              {s.descriptionEs && (
                <p
                  className={`font-body text-xs lg:text-sm ${
                    blue ? "text-paper/70" : "text-ink/70"
                  }`}
                >
                  {s.descriptionEs}
                </p>
              )}
              {s.location && (
                <p
                  className={`font-body mt-auto pt-1.5 text-xs font-semibold uppercase tracking-widest lg:text-sm ${
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
