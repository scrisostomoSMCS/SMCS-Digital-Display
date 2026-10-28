"use client";

import { createContext, useContext, type ReactNode } from "react";
import { BED_PANEL_CLEARANCE } from "@/components/BedAvailabilitySlide";
import { SHOW_BED_AVAILABILITY_ON_BULLETIN } from "@/lib/bedAvailability";

/*
  Whether something is floating over the top of the bulletin canvas right now,
  so a slide that would otherwise use that space has to keep it clear: the bed
  panel (while SHOW_BED_AVAILABILITY_ON_BULLETIN is on) or a live staff
  announcement. InformationDisplay provides the live answer.

  Defaults to the bed flag alone, which is what the manage page's previews
  draw (they show the bed panel when it is on, and never an announcement).

  Only slides that opt in read this; the built-in pages still reserve the band
  unconditionally, because the services page's weather pill lives inside it.
*/
const TopBandContext = createContext<boolean>(SHOW_BED_AVAILABILITY_ON_BULLETIN);

export function TopBandProvider({
  reserved,
  children,
}: {
  reserved: boolean;
  children: ReactNode;
}) {
  return <TopBandContext.Provider value={reserved}>{children}</TopBandContext.Provider>;
}

// BED_PANEL_CLEARANCE while the top band is in use, otherwise nothing.
export const useTopBandClearance = () =>
  useContext(TopBandContext) ? BED_PANEL_CLEARANCE : "";
