import type { ReactNode } from "react";

/*
  Full-screen frame for a signage page. Each page picks a bold full-bleed
  background so the three feel distinct as they rotate: white, blue, or teal.
  Text color is set for contrast (white on blue, black on teal/white).
*/
type Bg = "paper" | "blue" | "teal";

const BG: Record<Bg, string> = {
  paper: "bg-paper text-ink",
  blue: "bg-blue text-paper",
  teal: "bg-teal text-ink",
};

export default function InfoPageShell({
  bg = "paper",
  children,
}: {
  bg?: Bg;
  children: ReactNode;
}) {
  return (
    <div
      className={`font-body relative flex h-full flex-col overflow-hidden px-4 pt-4 pb-12 sm:px-6 sm:pt-5 lg:px-16 lg:pt-8 lg:pb-16 ${BG[bg]}`}
    >
      {children}
    </div>
  );
}
