"use client";

import { motion } from "framer-motion";
import InfoPageShell from "./InfoPageShell";
import InfoEyebrow from "./InfoEyebrow";
import RotatingLeaf from "./RotatingLeaf";
import { staggerContainer, riseItem, headerIn } from "./motion";
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
          className={`flex h-4/5 w-4/5 items-center justify-center border-2 text-lg ${tone}`}
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
      className="shrink-0"
    >
      <InfoEyebrow tone={eyebrowTone} />
      <h1 className="font-display mt-2 text-3xl leading-none sm:text-4xl lg:text-6xl">
        {slide.title}
      </h1>
      {slide.titleEs && (
        <p className="font-display mt-1 text-xl leading-tight opacity-80 sm:text-2xl lg:text-4xl">
          {slide.titleEs}
        </p>
      )}
    </motion.header>
  );

  const Leaf = (
    <div className="pointer-events-none absolute bottom-8 right-14 hidden lg:block">
      <RotatingLeaf size={150} className={leafColor} duration={25} />
    </div>
  );

  if (slide.template === "image-focus") {
    return (
      <InfoPageShell bg={bg}>
        <div className="relative z-10 flex h-full flex-col">
          <InfoEyebrow tone={eyebrowTone} />
          <div className="mt-4 min-h-0 flex-1">
            <ImageSlot src={img} tone={placeholderTone} />
          </div>
          {slide.caption && (
            <div className="mt-4 shrink-0">
              <p className="font-display text-2xl leading-tight sm:text-3xl lg:text-5xl">
                {slide.caption}
              </p>
              {slide.captionEs && (
                <p className="font-display mt-1 text-lg leading-tight opacity-80 sm:text-xl lg:text-3xl">
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
        <div className="relative z-10 mt-4 grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto pb-2 lg:mt-6 lg:items-center lg:gap-8 lg:overflow-visible lg:pb-0 lg:grid-cols-2">
          <div className="min-h-48 lg:h-full lg:min-h-0">
            <ImageSlot src={img} tone={placeholderTone} />
          </div>
          <div>
            <p className="font-body text-lg font-medium sm:text-xl lg:text-3xl">
              {slide.body}
            </p>
            {slide.bodyEs && (
              <p className="font-body mt-2 text-base font-medium opacity-80 sm:text-lg lg:mt-3 lg:text-2xl">
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
          className="relative z-10 mt-4 grid min-h-0 grid-cols-1 gap-3 overflow-y-auto pb-2 sm:grid-cols-2 lg:mt-7 lg:gap-4 lg:overflow-visible lg:pb-0"
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
                <div className="text-lg font-semibold sm:text-xl lg:text-3xl">{item}</div>
                {slide.itemsEs[i] && (
                  <div className="text-sm font-medium opacity-80 sm:text-base lg:text-xl">
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
        className="relative z-10 mt-4 max-w-5xl min-h-0 overflow-y-auto pb-2 lg:mt-6 lg:overflow-visible lg:pb-0"
      >
        <p className="font-body text-lg font-medium sm:text-xl lg:text-3xl">
          {slide.body}
        </p>
        {slide.bodyEs && (
          <p className="font-body mt-2 text-base font-medium opacity-80 sm:text-lg lg:mt-3 lg:text-2xl">
            {slide.bodyEs}
          </p>
        )}
      </motion.div>
    </InfoPageShell>
  );
}
