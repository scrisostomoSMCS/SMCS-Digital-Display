/*
  Generic content section wrapper. Keeps spacing and max-width consistent
  across the page and gives each block an optional heading + accent divider.
*/
type SectionProps = {
  id?: string;
  title?: string;
  className?: string;
  /*
    Opt-in overrides for the staff editor, which runs on wide admin monitors
    and is far longer than any public page. Public pages keep the reading-width
    clamp and the roomier rhythm, so neither flag changes them.
      wide  - drop the reading-width clamp and let the page container decide.
      dense - tighten the vertical rhythm.
  */
  wide?: boolean;
  dense?: boolean;
  children: React.ReactNode;
};

export default function Section({
  id,
  title,
  className,
  wide = false,
  dense = false,
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      className={`border-b border-placeholder ${className ?? ""}`}
    >
      <div
        className={`mx-auto px-6 ${wide ? "max-w-none" : "max-w-6xl"} ${
          dense ? "py-8 md:py-10" : "py-12 md:py-16"
        }`}
      >
        {title && (
          <div className="mb-6">
            <h2 className="font-display text-4xl md:text-5xl">{title}</h2>
            {/* Teal accent divider under each section heading */}
            <span className="mt-3 block h-1 w-20 bg-teal" />
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
