import Image from "next/image";

/*
  Reusable image block with optional white text overlaid on top.

  - When `src` is provided it renders a real next/image (fills the frame).
  - When `src` is omitted it renders a neutral gray placeholder block so the
    layout can be reviewed before real images exist (Phase 1).
  - When `children` are provided they sit on top of a dark scrim so white
    text stays legible over any image.
*/
type ImageWithOverlayProps = {
  /** Image source. Leave undefined to show the gray placeholder. */
  src?: string;
  /** Alt text — required when a real image is used. */
  alt?: string;
  /** Overlay content (rendered in white over a dark scrim). */
  children?: React.ReactNode;
  /** Tailwind height utility for the frame. */
  heightClassName?: string;
  /** Accent frame color. */
  frame?: "teal" | "blue";
};

export default function ImageWithOverlay({
  src,
  alt = "",
  children,
  heightClassName = "h-72 md:h-96",
  frame = "teal",
}: ImageWithOverlayProps) {
  const frameClass = frame === "blue" ? "border-blue" : "border-teal";

  return (
    <div
      className={`relative w-full overflow-hidden border-2 ${frameClass} ${heightClassName}`}
    >
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" />
      ) : (
        // Neutral gray placeholder standing in for a real image.
        <div
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center bg-placeholder"
        >
          <span className="text-base font-semibold uppercase tracking-wide text-ink/50">
            Image placeholder
          </span>
        </div>
      )}

      {children && (
        <>
          {/* Dark scrim improves contrast for white overlay text. */}
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-paper">
            <div className="max-w-2xl">{children}</div>
          </div>
        </>
      )}
    </div>
  );
}
