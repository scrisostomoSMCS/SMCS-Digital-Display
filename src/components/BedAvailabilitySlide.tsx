'use client';
import { useEffect, useState } from 'react';

type Count = { label: string; count: number };
type Program = { key: string; label: string; counts: Record<string, Count>; total: number };
type BedData = {
  ok: boolean;
  programs?: Program[];
  reserve_phone?: string;
  updated_at_display?: string;
};

// Attention panel: always white text on red so live bed counts stand out
// against the paper-white bulletin. Red is intentional here (outside the
// teal/blue palette) because this is a live-status callout.
const RED = '#c1121f';

// The API labels are verbose ("Male beds available", "Double Rooms Available").
// The panel header already says "Bed Availability," so drop the redundant
// "beds/rooms available" tail and keep only the qualifier ("Male", "Double").
// A plain "Available" collapses to nothing, leaving just the number.
const shortLabel = (label: string) =>
  label.replace(/\s*(beds?|rooms?)?\s*available$/i, '').trim();

export default function BedAvailabilitySlide({ className = '' }: { className?: string }) {
  const [data, setData] = useState<BedData | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/beds');
        const json: BedData = await res.json();
        // Only overwrite on success — a failed poll keeps the last good numbers
        // on screen rather than blanking the display.
        if (!cancelled && json.ok) setData(json);
      } catch {
        /* keep showing last known data */
      }
    };

    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (!data?.programs) return null; // Never render a zero we're not sure of

  // Split into two balanced columns so the panel stays short and wide.
  const mid = Math.ceil(data.programs.length / 2);
  const columns = [data.programs.slice(0, mid), data.programs.slice(mid)];

  return (
    <section
      className={`font-body overflow-hidden rounded-lg text-white shadow-lg ${className}`}
      style={{ backgroundColor: RED }}
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
                        const q = shortLabel(c.label);
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
