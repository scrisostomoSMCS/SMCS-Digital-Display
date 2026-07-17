"use client";

import { motion } from "framer-motion";
import {
  iconFromKey,
  serviceIconFor,
  type InfoService,
} from "@/lib/infoContent";
import { riseItem } from "./motion";

/*
  A single service card on the Digital Bulletin. Shows everything at every size:
  icon + name (English / Spanish), times, description (English + Spanish), and
  location. On the desktop wall display it sits in a fixed grid cell and clips
  (lg:overflow-hidden); on mobile it grows to its natural height so nothing is
  cut off (the whole bulletin scrolls, see InformationDisplay).
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
  iconSize = 30,
}: {
  service: InfoService;
  tone: Tone;
  iconSize?: number;
}) {
  const colors = TONE[tone];
  const Icon = iconFromKey(service.icon) ?? serviceIconFor(service.name);

  return (
    <motion.div
      variants={riseItem}
      className={`flex min-h-0 min-w-0 flex-col p-4 lg:overflow-hidden lg:px-5 lg:py-3 ${colors.card}`}
    >
      <div className={`flex min-w-0 items-start gap-3 ${colors.heading}`}>
        {Icon && (
          <Icon
            size={iconSize}
            strokeWidth={2}
            aria-hidden="true"
            className="mt-1 shrink-0"
          />
        )}
        <h2 className="font-body min-w-0 flex-1 break-words text-xl font-semibold leading-tight lg:text-2xl">
          {service.name}
          {service.nameEs && (
            <span
              className={`block text-base font-medium lg:inline lg:text-2xl ${colors.secondary}`}
            >
              <span className="hidden lg:inline"> / </span>
              {service.nameEs}
            </span>
          )}
        </h2>
      </div>

      <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        {service.time && (
          <div className="font-body mt-2 space-y-0.5 text-lg font-semibold lg:mt-1.5 lg:text-xl">
            {service.time.split("\n").map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}
        {service.description && (
          <p className={`font-body mt-1 text-sm lg:text-base ${colors.description}`}>
            {service.description}
          </p>
        )}
        {service.descriptionEs && (
          <p className={`font-body text-xs lg:text-sm ${colors.translation}`}>
            {service.descriptionEs}
          </p>
        )}
        {service.location && (
          <p
            className={`font-body mt-2 pt-1.5 text-xs font-semibold uppercase tracking-widest lg:mt-auto ${colors.location}`}
          >
            {service.location}
          </p>
        )}
      </div>
    </motion.div>
  );
}
