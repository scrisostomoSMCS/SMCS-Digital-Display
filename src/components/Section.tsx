/*
  Generic content section wrapper. Keeps spacing and max-width consistent
  across the page and gives each block an optional heading + accent divider.
*/
type SectionProps = {
  id?: string;
  title?: string;
  children: React.ReactNode;
};

export default function Section({ id, title, children }: SectionProps) {
  return (
    <section id={id} className="border-b border-placeholder">
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        {title && (
          <div className="mb-6">
            <h2 className="text-3xl md:text-4xl">{title}</h2>
            {/* Teal accent divider under each section heading */}
            <span className="mt-3 block h-1 w-20 bg-teal" />
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
