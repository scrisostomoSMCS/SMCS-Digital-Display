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

export default function BedAvailabilitySlide() {
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

  return (
    <section className="bed-availability">
      <h2>Bed Availability</h2>
      {data.updated_at_display && <p className="as-of">As of {data.updated_at_display}</p>}

      <ul>
        {data.programs.map((p) => (
          <li key={p.key} className={p.total === 0 ? 'is-full' : 'has-space'}>
            <span className="program">{p.label}</span>
            <span className="counts">
              {Object.entries(p.counts)
                .map(([k, c]) => `${c.count} ${c.label}`)
                .join(', ')}
            </span>
          </li>
        ))}
      </ul>

      {data.reserve_phone && <p className="reserve">To reserve a bed call {data.reserve_phone}</p>}
    </section>
  );
}