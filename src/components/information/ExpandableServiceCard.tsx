"use client";

import { motion } from "framer-motion";
import {
  iconFromKey,
  serviceIconFor,
  type InfoService,
} from "@/lib/infoContent";
import { riseItem } from "./motion";

/*
  A single service card on the Digital Bulletin. Shows everything: icon + name
  (English / Spanish), times, description (English + Spanish), and location. The
  two weekly-services pages opt into roomier cards; other bulletin cards keep
  their existing fixed-grid treatment. Breakpoints are container queries against
  the bulletin canvas, so a card looks the same on a 4K wall screen and in a
  small embedded iframe (see lib/bulletinCanvas).
*/
type Tone = "blue" | "teal" | "paper";

const TONE = {
  blue: {
    card: "bg-blue text-paper",
    heading: "",
    secondary: "text-paper/75",
    description: "text-paper/90",
    translation: "text-paper/70",
    location: "text-paper/80",
  },
  teal: {
    card: "bg-teal text-ink",
    heading: "",
    secondary: "text-ink/65",
    description: "text-ink/90",
    translation: "text-ink/70",
    location: "text-ink/70",
  },
  paper: {
    card: "bg-paper text-ink",
    heading: "text-blue",
    secondary: "text-blue/65",
    description: "",
    translation: "text-ink/70",
    location: "text-ink/60",
  },
} satisfies Record<Tone, Record<string, string>>;

export default function ExpandableServiceCard({
  service,
  tone,
  iconSize = 40,
  roomy = false,
}: {
  service: InfoService;
  tone: Tone;
  iconSize?: number;
  roomy?: boolean;
}) {
  const colors = TONE[tone];
  const Icon = iconFromKey(service.icon) ?? serviceIconFor(service.name);

  return (
    <motion.div
      variants={riseItem}
      className={`flex min-h-0 min-w-0 flex-col p-5 ${
        roomy
          ? "@min-[64rem]:px-8 @min-[64rem]:py-6"
          : "@min-[64rem]:overflow-hidden @min-[64rem]:px-6 @min-[64rem]:py-4"
      } ${colors.card}`}
    >
      <div className={`flex min-w-0 items-start gap-4 ${colors.heading}`}>
        {Icon && (
          <Icon
            size={iconSize}
            strokeWidth={2}
            aria-hidden="true"
            className="mt-1 shrink-0"
          />
        )}
        <h2 className="font-body min-w-0 flex-1 break-words text-3xl font-semibold leading-tight">
          {service.name}
          {service.nameEs && (
            <span
              className={`block text-2xl font-medium @min-[64rem]:inline ${colors.secondary}`}
            >
              <span className="hidden @min-[64rem]:inline"> / </span>
              {service.nameEs}
            </span>
          )}
        </h2>
      </div>

      <div className="@min-[64rem]:flex @min-[64rem]:min-h-0 @min-[64rem]:flex-1 @min-[64rem]:flex-col">
        {service.time && (
          <div
            className={`font-body mt-3 space-y-1 text-2xl font-semibold @min-[64rem]:mt-2 ${
              roomy ? "@min-[64rem]:text-xl" : "@min-[64rem]:text-3xl"
            }`}
          >
            {service.time.split("\n").map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}
        {/* Descriptions carry most of a card's height, so they take a smaller
            step up than the name/time above them. On the densest services page
            the full 1.5x description would push the card row past the canvas
            (see the overflow note in ServicesOverviewPage). */}
        {service.description && (
          <p
            className={`font-body mt-2 text-xl ${
              roomy ? "@min-[64rem]:leading-relaxed" : ""
            } ${colors.description}`}
          >
            {service.description}
          </p>
        )}
        {service.descriptionEs && (
          <p
            className={`font-body text-lg ${
              roomy ? "@min-[64rem]:leading-relaxed" : ""
            } ${colors.translation}`}
          >
            {service.descriptionEs}
          </p>
        )}
        {service.location && (
          <p
            className={`font-body mt-3 pt-2 text-lg font-semibold uppercase tracking-widest @min-[64rem]:mt-auto ${colors.location}`}
          >
            {service.location}
          </p>
        )}
      </div>
    </motion.div>
  );
}
