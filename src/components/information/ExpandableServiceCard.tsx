"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import {
  iconFromKey,
  serviceIconFor,
  type InfoService,
} from "@/lib/infoContent";
import { riseItem } from "./motion";

type Tone = "blue" | "teal" | "paper";

const TONE = {
  blue: {
    card: "bg-blue text-paper",
    heading: "",
    secondary: "text-paper/75",
    description: "text-paper/90",
    translation: "text-paper/70",
    location: "text-paper/80",
    hover: "hover:bg-paper/10",
  },
  teal: {
    card: "bg-teal text-ink",
    heading: "",
    secondary: "text-ink/65",
    description: "text-ink/90",
    translation: "text-ink/70",
    location: "text-ink/70",
    hover: "hover:bg-ink/5",
  },
  paper: {
    card: "bg-paper text-ink",
    heading: "text-blue",
    secondary: "text-blue/65",
    description: "",
    translation: "text-ink/70",
    location: "text-ink/60",
    hover: "hover:bg-blue/5",
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
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const colors = TONE[tone];
  const Icon = iconFromKey(service.icon) ?? serviceIconFor(service.name);

  const heading = (
    <>
      {Icon && (
        <Icon
          size={iconSize}
          strokeWidth={2}
          aria-hidden="true"
          className="mt-1 shrink-0"
        />
      )}
      <h2 className="font-body min-w-0 flex-1 text-xl font-semibold leading-tight lg:text-2xl">
        {service.name}
        {service.nameEs && (
          <span className={`font-medium ${colors.secondary}`}>
            {" "}/ {service.nameEs}
          </span>
        )}
      </h2>
    </>
  );

  return (
    <motion.div
      variants={riseItem}
      className={`flex min-h-0 flex-col overflow-hidden p-0 lg:px-5 lg:py-3 ${colors.card}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        aria-label={`${open ? "Hide" : "Show"} details for ${service.name}`}
        onClick={() => setOpen((value) => !value)}
        className={`flex min-h-16 w-full items-start gap-3 p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-current lg:hidden ${colors.heading} ${colors.hover}`}
      >
        {heading}
        <ChevronDown
          size={24}
          strokeWidth={2.25}
          aria-hidden="true"
          className={`mt-1 shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <div className={`hidden items-start gap-3 lg:flex ${colors.heading}`}>
        {heading}
      </div>

      <div
        id={detailsId}
        className={`overflow-hidden px-4 transition-[max-height,opacity,padding] duration-300 lg:flex lg:max-h-none lg:flex-1 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0 lg:opacity-100 ${
          open ? "max-h-[40rem] pb-4 opacity-100" : "max-h-0 pb-0 opacity-0"
        }`}
      >
        {service.time && (
          <div className="font-body mt-1.5 space-y-0.5 text-lg font-semibold lg:text-xl">
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
            className={`font-body mt-auto pt-1.5 text-xs font-semibold uppercase tracking-widest lg:text-sm ${colors.location}`}
          >
            {service.location}
          </p>
        )}
      </div>
    </motion.div>
  );
}
