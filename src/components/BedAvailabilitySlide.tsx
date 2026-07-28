'use client';
import { shortBedLabel, useBedAvailability } from '@/lib/useBedAvailability';

// Attention panel: always white text on red so live bed counts stand out
// against the paper-white bulletin. Red is intentional here (outside the
// teal/blue palette) because this is a live-status callout.
export const BED_RED = '#c1121f';

/*
  The panel floats over the top-right corner of the 1920x1080 bulletin canvas
  (see InformationDisplay), so every slide has to keep that corner clear or the
  red panel would cover slide content. These two constants are the contract:

  BED_PANEL_WIDTH   width of the panel + the back button parked to its left,
                    as Tailwind `right-*` offsets on the canvas.
  BED_PANEL_CLEARANCE
                    a min-height applied to each slide's header band so slide
                    content always starts BELOW the panel. Sized from the
                    rendered panel height (~220px) plus the canvas's own top
                    padding and a gap. Only applies on the wall display
                    (@min-[64rem]); narrow embeds stack normally.

  If the panel's type or padding changes, re-measure it and update the
  clearance to match, otherwise slides will start creeping underneath it.
*/
export const BED_PANEL_CLEARANCE = '@min-[64rem]:min-h-[12.5rem]';

export default function BedAvailabilitySlide({ className = '' }: { className?: string }) {
  const data = useBedAvailability();

  if (!data?.programs) return null; // Never render a zero we're not sure of

  // Split into two balanced columns so the panel stays short and wide.
  const mid = Math.ceil(data.programs.length / 2);
  const columns = [data.programs.slice(0, mid), data.programs.slice(mid)];

  return (
    <section
      className={`font-body overflow-hidden rounded-xl text-white shadow-lg ${className}`}
      style={{ backgroundColor: BED_RED }}
    >
      <header className="flex items-baseline justify-between gap-3 px-4 pb-1.5 pt-2.5">
        <h2 className="text-xl font-bold leading-tight tracking-tight">Bed Availability</h2>
        {data.updated_at_display && (
          <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-white/70">
            {data.updated_at_display}
          </p>
        )}
      </header>

      <div className="flex gap-4 px-4 pb-2">
        {columns.map((col, ci) => (
          <ul key={ci} className="flex-1 divide-y divide-white/15">
            {col.map((p) => {
              const full = p.total === 0;
              return (
                <li
                  key={p.key}
                  className="flex items-baseline justify-between gap-2 py-0.5 text-sm leading-snug"
                >
                  <span className="font-semibold">{p.label}</span>
                  {full ? (
                    <span className="shrink-0 rounded-full bg-white/15 px-1.5 text-xs font-bold uppercase tracking-wide text-white/80">
                      Full
                    </span>
                  ) : (
                    // The number is what someone reads from across the room, so
                    // it runs a step larger than its qualifier ("Male", "Double").
                    <span className="shrink-0 whitespace-nowrap text-right text-xs text-white/90">
                      {Object.entries(p.counts).map(([k, c], i) => {
                        const q = shortBedLabel(c.label);
                        return (
                          <span key={k}>
                            {i > 0 && <span className="text-white/50"> · </span>}
                            <b className="text-base text-white">{c.count}</b>
                            {q && ` ${q}`}
                          </span>
                        );
                      })}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ))}
      </div>

      {data.reserve_phone && (
        <p className="bg-black/15 px-4 py-1.5 text-sm font-semibold">
          Reserve:{' '}
          <span className="whitespace-nowrap font-bold">{data.reserve_phone}</span>
        </p>
      )}
    </section>
  );
}
