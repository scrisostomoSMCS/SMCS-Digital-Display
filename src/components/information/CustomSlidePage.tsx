"use client";

import SlideTemplateView from "./SlideTemplateView";
import type { Slide } from "@/lib/slides";

// A custom slide on the live display = the shared template renderer (the exact
// same component the editor preview uses, so they can never drift).
export default function CustomSlidePage({ slide }: { slide: Slide }) {
  return <SlideTemplateView slide={slide} />;
}
