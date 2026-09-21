"use client";

import type { ButtonHTMLAttributes } from "react";

/*
  Announcement action button: a rounded pill with a solid black pill offset
  behind it, so the control reads as sitting above the page rather than printed
  on it. Pressing it drops the face onto the shadow.

  NOTE ON CONTRAST. The teal face carries BLACK text, not white. White on
  --color-teal (#00aaa6) is 2.88:1 and fails WCAG AA outright; black on it is
  7.30:1. The green face is #0f7038, chosen because white on it is 6.19:1 —
  the lighter greens that read as "success green" all land near 4.5:1 or below.

  The offset pill is drawn at inset-0 of the button and then translated, so it
  hangs 6px past the button's own box. The button carries a matching
  margin-right/bottom so surrounding layout still reserves that space and
  neighbours are never overlapped.
*/
const TONES = {
  teal: "bg-teal text-ink",
  green: "bg-green text-paper",
} as const;

type DepthButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: keyof typeof TONES;
};

export default function DepthButton({
  tone = "teal",
  className = "",
  children,
  ...props
}: DepthButtonProps) {
  return (
    <button
      {...props}
      className={`group relative mr-[6px] mb-[6px] inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-60 ${className}`}
    >
      {/* The depth shape. Stays put while the face moves, which is what makes
          the press read as the button travelling down onto it. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 translate-x-[6px] translate-y-[6px] rounded-full bg-ink"
      />
      <span
        className={`relative w-full rounded-full px-7 py-3 text-lg font-bold transition-transform group-hover:-translate-x-[1px] group-hover:-translate-y-[1px] group-active:translate-x-[6px] group-active:translate-y-[6px] ${TONES[tone]}`}
      >
        {children}
      </span>
    </button>
  );
}
