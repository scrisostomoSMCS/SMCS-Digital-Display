"use client";

import { motion } from "framer-motion";
import InfoPageShell from "./InfoPageShell";
import InfoEyebrow from "./InfoEyebrow";
import RotatingLeaf from "./RotatingLeaf";
import { staggerContainer, riseItem, headerIn } from "./motion";
import { slideImageUrl, type Slide } from "@/lib/slides";

/*
  Renders a custom slide in one of the on-brand layout templates. This SAME
  component draws the live /information display AND the editor's preview, driven
  by the same slide data, so the preview always matches the wall screen.
  Styling is fixed here (Playfair title, Poppins body, brand backgrounds, fitted
  image slots); the employee supplies content, template, and one brand color.
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
      <h1 className="font-display mt-2 text-5xl leading-none md:text-7xl">
        {slide.title}
      </h1>
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
            <p className="font-display mt-4 shrink-0 text-4xl leading-tight md:text-5xl">
              {slide.caption}
            </p>
          )}
        </div>
      </InfoPageShell>
    );
  }

  if (slide.template === "title-image-text") {
    return (
      <InfoPageShell bg={bg}>
        {Header}
        <div className="relative z-10 mt-6 grid min-h-0 flex-1 grid-cols-1 items-center gap-8 lg:grid-cols-2">
          <div className="h-full min-h-0">
            <ImageSlot src={img} tone={placeholderTone} />
          </div>
          <p className="font-body text-2xl font-medium md:text-3xl">
            {slide.body}
          </p>
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
          className="relative z-10 mt-7 grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          {slide.items.map((item, i) => (
            <motion.div
              key={i}
              variants={riseItem}
              className="font-body flex items-center gap-4 text-2xl font-semibold md:text-3xl"
            >
              <span className={`h-4 w-4 shrink-0 ${marker}`} aria-hidden="true" />
              {item}
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
      <motion.p
        variants={riseItem}
        initial={init}
        animate="show"
        className="font-body relative z-10 mt-6 max-w-5xl text-2xl font-medium md:text-3xl"
      >
        {slide.body}
      </motion.p>
    </InfoPageShell>
  );
}
