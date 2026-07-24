'use client';
import { shortBedLabel, useBedAvailability } from '@/lib/useBedAvailability';

// Attention panel: always white text on red so live bed counts stand out
// against the paper-white bulletin. Red is intentional here (outside the
// teal/blue palette) because this is a live-status callout.
export const BED_RED = '#c1121f';

export default function BedAvailabilitySlide({ className = '' }: { className?: string }) {
  const data = useBedAvailability();

  if (!data?.programs) return null; // Never render a zero we're not sure of

  // Split into two balanced columns so the panel stays short and wide.
  const mid = Math.ceil(data.programs.length / 2);
  const columns = [data.programs.slice(0, mid), data.programs.slice(mid)];

  return (
    <section
      className={`font-body overflow-hidden rounded-lg text-white shadow-lg ${className}`}
      style={{ backgroundColor: BED_RED }}
    >
      <header className="flex items-baseline justify-between gap-2 px-2.5 pb-1 pt-1.5">
        <h2 className="text-xs font-bold leading-tight tracking-tight">Bed Availability</h2>
        {data.updated_at_display && (
          <p className="shrink-0 text-[8px] font-semibold uppercase tracking-wide text-white/70">
            {data.updated_at_display}
          </p>
        )}
      </header>

      <div className="flex gap-4 px-2.5 pb-1.5">
        {columns.map((col, ci) => (
          <ul key={ci} className="flex-1 divide-y divide-white/15">
            {col.map((p) => {
              const full = p.total === 0;
              return (
                <li
                  key={p.key}
                  className="flex items-baseline justify-between gap-2 py-0.5 text-[10px] leading-snug"
                >
                  <span className="font-semibold">{p.label}</span>
                  {full ? (
                    <span className="shrink-0 rounded-full bg-white/15 px-1 text-[8px] font-bold uppercase tracking-wide text-white/80">
                      Full
                    </span>
                  ) : (
                    <span className="shrink-0 whitespace-nowrap text-right text-white/90">
                      {Object.entries(p.counts).map(([k, c], i) => {
                        const q = shortBedLabel(c.label);
                        return (
                          <span key={k}>
                            {i > 0 && <span className="text-white/50"> · </span>}
                            <b className="text-white">{c.count}</b>
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
        <p className="bg-black/15 px-2.5 py-1 text-[10px] font-semibold">
          Reserve:{' '}
          <span className="whitespace-nowrap font-bold">{data.reserve_phone}</span>
        </p>
      )}
    </section>
  );
}
