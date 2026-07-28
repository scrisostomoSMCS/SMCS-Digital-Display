"use client";

import { motion } from "framer-motion";
import InfoPageShell from "./InfoPageShell";
import InfoEyebrow from "./InfoEyebrow";
import RotatingLeaf from "./RotatingLeaf";
import { staggerContainer, riseItem, headerIn } from "./motion";
import { BED_PANEL_CLEARANCE } from "@/components/BedAvailabilitySlide";
import { slideImageUrl, type Slide } from "@/lib/slides";

/*
  Renders a custom slide in one of the on-brand layout templates. This SAME
  component draws the live /information (Digital Bulletin) display AND the
  editor's preview, driven by the same slide data, so the preview always matches
  the wall screen.

  BILINGUAL: the bulletin is unattended (no language chooser), so each text field
  shows English with its Spanish translation directly beneath, styled a step
  smaller and lighter so the two are easy to tell apart but both readable from a
  distance. Spanish lines only appear when a Spanish value exists.
*/

function ImageSlot({ src, tone }: { src: string | null; tone: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden">
      {src ? (
        // Auto-fitted to the slot (object-contain) so it can never overflow.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="max-h-full max-w-full object-contain" />
      ) : (
        <div
          className={`flex h-4/5 w-4/5 items-center justify-center border-2 text-2xl ${tone}`}
        >
          No image
        </div>
      )}
    </div>
  );
}

export default function SlideTemplateView({
  slide,
  animate = true,
}: {
  slide: Slide;
  animate?: boolean;
}) {
  const bg = slide.background;
  const eyebrowTone = bg === "blue" ? "white" : bg === "teal" ? "ink" : "blue";
  const leafColor = bg === "teal" ? "text-paper/30" : "text-teal/25";
  const marker = bg === "teal" ? "bg-blue" : "bg-teal";
  const placeholderTone = "border-current/20 text-current/40";
  const img = slideImageUrl(slide.imagePath);
  const init = animate ? "hidden" : false;

  const Header = (
    <motion.header
      variants={headerIn}
      initial={init}
      animate="show"
      className={`shrink-0 ${BED_PANEL_CLEARANCE}`}
    >
      <InfoEyebrow tone={eyebrowTone} />
      <h1 className="font-display mt-2 max-w-[68%] text-4xl leading-none @min-[40rem]:text-5xl @min-[64rem]:text-7xl">
        {slide.title}
      </h1>
      {slide.titleEs && (
        <p className="font-display mt-1 max-w-[68%] text-3xl leading-tight opacity-80 @min-[40rem]:text-3xl @min-[64rem]:text-5xl">
          {slide.titleEs}
        </p>
      )}
    </motion.header>
  );

  const Leaf = (
    <div className="pointer-events-none absolute bottom-8 right-14 hidden @min-[64rem]:block">
      <RotatingLeaf size={190} className={leafColor} duration={25} />
    </div>
  );

  if (slide.template === "image-focus") {
    return (
      <InfoPageShell bg={bg}>
        <div className="relative z-10 flex h-full flex-col">
          {/* No headline on this template, so the eyebrow band itself carries
              the bed-panel clearance and the image starts below the panel. */}
          <div className={`shrink-0 ${BED_PANEL_CLEARANCE}`}>
            <InfoEyebrow tone={eyebrowTone} />
          </div>
          <div className="mt-4 min-h-0 flex-1">
            <ImageSlot src={img} tone={placeholderTone} />
          </div>
          {slide.caption && (
            <div className="mt-4 shrink-0">
              <p className="font-display text-3xl leading-tight @min-[40rem]:text-4xl @min-[64rem]:text-6xl">
                {slide.caption}
              </p>
              {slide.captionEs && (
                <p className="font-display mt-1 text-2xl leading-tight opacity-80 @min-[40rem]:text-3xl @min-[64rem]:text-4xl">
                  {slide.captionEs}
                </p>
              )}
            </div>
          )}
        </div>
      </InfoPageShell>
    );
  }

  if (slide.template === "title-image-text") {
    return (
      <InfoPageShell bg={bg}>
        {Header}
        <div className="relative z-10 mt-4 grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto pb-2 @min-[64rem]:mt-6 @min-[64rem]:items-center @min-[64rem]:gap-8 @min-[64rem]:overflow-visible @min-[64rem]:pb-0 @min-[64rem]:grid-cols-2">
          <div className="min-h-48 @min-[64rem]:h-full @min-[64rem]:min-h-0">
            <ImageSlot src={img} tone={placeholderTone} />
          </div>
          <div>
            <p className="font-body text-2xl font-medium @min-[40rem]:text-3xl @min-[64rem]:text-4xl">
              {slide.body}
            </p>
            {slide.bodyEs && (
              <p className="font-body mt-2 text-2xl font-medium opacity-80 @min-[40rem]:text-2xl @min-[64rem]:mt-3 @min-[64rem]:text-3xl">
                {slide.bodyEs}
              </p>
            )}
          </div>
        </div>
      </InfoPageShell>
    );
  }

  if (slide.template === "title-list") {
    return (
      <InfoPageShell bg={bg}>
        {Leaf}
        {Header}
        <motion.div
          variants={staggerContainer}
          initial={init}
          animate="show"
          className="relative z-10 mt-4 grid min-h-0 grid-cols-1 gap-3 overflow-y-auto pb-2 @min-[40rem]:grid-cols-2 @min-[64rem]:mt-7 @min-[64rem]:gap-4 @min-[64rem]:overflow-visible @min-[64rem]:pb-0"
        >
          {slide.items.map((item, i) => (
            <motion.div
              key={i}
              variants={riseItem}
              className="font-body flex items-start gap-4"
            >
              <span
                className={`mt-2 h-4 w-4 shrink-0 ${marker}`}
                aria-hidden="true"
              />
              <div>
                <div className="text-2xl font-semibold @min-[40rem]:text-3xl @min-[64rem]:text-4xl">{item}</div>
                {slide.itemsEs[i] && (
                  <div className="text-xl font-medium opacity-80 @min-[40rem]:text-2xl @min-[64rem]:text-3xl">
                    {slide.itemsEs[i]}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </InfoPageShell>
    );
  }

  // default: title-body
  return (
    <InfoPageShell bg={bg}>
      {Leaf}
      {Header}
      <motion.div
        variants={riseItem}
        initial={init}
        animate="show"
        className="relative z-10 mt-4 max-w-5xl min-h-0 overflow-y-auto pb-2 @min-[64rem]:mt-6 @min-[64rem]:overflow-visible @min-[64rem]:pb-0"
      >
        <p className="font-body text-2xl font-medium @min-[40rem]:text-3xl @min-[64rem]:text-4xl">
          {slide.body}
        </p>
        {slide.bodyEs && (
          <p className="font-body mt-2 text-2xl font-medium opacity-80 @min-[40rem]:text-2xl @min-[64rem]:mt-3 @min-[64rem]:text-3xl">
            {slide.bodyEs}
          </p>
        )}
      </motion.div>
    </InfoPageShell>
  );
}
