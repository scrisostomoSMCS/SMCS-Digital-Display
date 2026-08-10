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

function ImageSlot({
  src,
  tone,
  fill = false,
}: {
  src: string | null;
  tone: string;
  fill?: boolean;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden">
      {src ? (
        // Auto-fitted to the slot (object-contain) so it can never overflow.
        // fill: also scales SMALL images UP to the slot instead of leaving them
        // at natural size — object-contain still preserves the aspect ratio and
        // centers, so nothing is cropped or stretched. Only "Image with caption"
        // wants this; elsewhere the image sits beside text and staying natural
        // size reads better.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className={
            fill
              ? "h-full w-full object-contain"
              : "max-h-full max-w-full object-contain"
          }
        />
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
        {/* Vertical split: image region on top takes every row the caption does
            not need (flex-1), caption sits centered underneath at its natural
            height. All proportional — no fixed pixel offsets — so it holds at
            any canvas scale, and the ratio is unaffected by how tall or wide the
            uploaded image happens to be.

            No headline on this template, so the eyebrow band itself carries
            BED_PANEL_CLEARANCE. That band is what keeps the TOP of the image
            below the live bed-availability panel, which floats over the
            top-right of every slide — without it a full-width image runs under
            the red card. The image takes the rest of the canvas from there. */}
        <div className="relative z-10 flex h-full min-h-0 flex-col">
          <div className={`shrink-0 ${BED_PANEL_CLEARANCE}`}>
            <InfoEyebrow tone={eyebrowTone} />
          </div>
          {/* Negative margins cancel InfoPageShell's own side padding at each
              breakpoint, so the image runs edge to edge on the canvas instead of
              stopping at the text margin. Keep these in step with the shell's
              px-* values or the image will not reach the edge (or will overhang
              it). The caption below stays inside the normal margins. */}
          <div className="-mx-4 mt-2 min-h-0 flex-1 @min-[40rem]:-mx-6 @min-[64rem]:-mx-16 @min-[64rem]:mt-3">
            <ImageSlot src={img} tone={placeholderTone} fill />
          </div>
          {/* Every row this block gives up is a row the image gets, and a taller
              image is also a WIDER one (object-contain scales both together), so
              the padding here is deliberately tight and the -mb-* reclaims most
              of the shell's bottom padding. English stays at text-6xl — this has
              to read from across a lobby — so the Spanish line carries the trim. */}
          {slide.caption && (
            <div className="shrink-0 px-4 py-1 text-center @min-[64rem]:-mb-5 @min-[64rem]:py-2">
              <p className="font-display mx-auto max-w-[90%] break-words text-3xl leading-tight @min-[40rem]:text-4xl @min-[64rem]:text-6xl">
                {slide.caption}
              </p>
              {slide.captionEs && (
                <p className="font-display mx-auto mt-1 max-w-[90%] break-words text-2xl leading-tight opacity-80 @min-[40rem]:text-3xl">
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
