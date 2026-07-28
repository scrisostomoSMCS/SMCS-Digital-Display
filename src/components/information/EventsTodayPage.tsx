"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import InfoPageShell from "./InfoPageShell";
import InfoEyebrow from "./InfoEyebrow";
import RotatingLeaf from "./RotatingLeaf";
import { staggerContainer, riseItem, headerIn } from "./motion";
import { supabase } from "@/lib/supabase";
import { fetchTodaysEvents, type DashboardEvent } from "@/lib/events";

/*
  Page 4, Events happening today. Auto-populated from the calendar's Supabase
  events (today's dashboard events), kept live via realtime. No manual editing.
*/

// UTC time (matches the app's wall-clock convention): "9", "9:30".
function hm(d: Date): string {
  const h = d.getUTCHours() % 12 || 12;
  const m = d.getUTCMinutes();
  return m === 0 ? `${h}` : `${h}:${String(m).padStart(2, "0")}`;
}
const mer = (d: Date) => (d.getUTCHours() < 12 ? "AM" : "PM");

function timeRange(startISO: string, endISO?: string): string {
  const start = new Date(startISO);
  if (!endISO) return `${hm(start)} ${mer(start)}`;
  const end = new Date(endISO);
  const sameMer = mer(start) === mer(end);
  return `${hm(start)}${sameMer ? "" : ` ${mer(start)}`} – ${hm(end)} ${mer(end)}`;
}

export default function EventsTodayPage() {
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      setEvents(await fetchTodaysEvents());
      setLoaded(true);
    };
    load();
    // Reuse the events realtime the dashboard uses, re-load on any change.
    const channel = supabase
      .channel("events-today")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <InfoPageShell bg="paper">
      <div className="pointer-events-none absolute bottom-8 right-14 hidden @min-[64rem]:block">
        <RotatingLeaf size={190} className="text-teal/20" duration={24} />
      </div>

      <motion.header
        variants={headerIn}
        initial="hidden"
        animate="show"
        className="shrink-0"
      >
        <InfoEyebrow tone="blue" />
        {/* Fixed labels are shown bilingually (this page isn't content-edited);
            event names/times come from the calendar as staff entered them. */}
        <h1 className="font-display mt-1 max-w-[76%] flex flex-wrap items-baseline gap-x-4 leading-none">
          <span className="text-4xl @min-[40rem]:text-5xl @min-[64rem]:text-7xl">Happening Today</span>
          <span className="text-3xl text-ink/60 @min-[40rem]:text-3xl @min-[64rem]:text-5xl">Eventos de Hoy</span>
        </h1>
      </motion.header>

      {loaded && events.length === 0 ? (
        <div className="flex flex-col items-start justify-center py-4 @min-[64rem]:min-h-0 @min-[64rem]:flex-1 @min-[64rem]:py-0">
          <p className="font-display text-3xl text-blue @min-[40rem]:text-4xl @min-[64rem]:text-6xl">
            No events scheduled today.
          </p>
          <p className="font-display text-3xl text-blue/70 @min-[40rem]:text-3xl @min-[64rem]:text-5xl">
            No hay eventos programados hoy.
          </p>
          <p className="font-body mt-6 max-w-3xl text-2xl font-medium @min-[40rem]:text-3xl @min-[64rem]:mt-10 @min-[64rem]:text-4xl">
            Our everyday services are still open, see the services list for
            what&rsquo;s always available.
          </p>
          <p className="font-body mt-2 max-w-3xl text-2xl font-medium text-ink/70 @min-[40rem]:text-2xl @min-[64rem]:mt-1 @min-[64rem]:text-3xl">
            Nuestros servicios diarios siguen abiertos; consulte la lista de
            servicios para ver lo que siempre está disponible.
          </p>
        </div>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="relative z-10 mt-5 flex flex-col gap-4 @min-[64rem]:mt-8 @min-[64rem]:min-h-0 @min-[64rem]:flex-1 @min-[64rem]:gap-5 @min-[64rem]:overflow-hidden"
        >
          {events.map((e, i) => (
            <motion.li
              key={e.id}
              variants={riseItem}
              className="flex flex-col items-start gap-1 border-l-4 border-blue bg-paper py-2 pl-3 @min-[64rem]:flex-row @min-[64rem]:items-center @min-[64rem]:gap-6 @min-[64rem]:border-l-8 @min-[64rem]:py-1 @min-[64rem]:pl-6"
            >
              {/* Big time block leads each row. */}
              <span className="font-body w-auto shrink-0 text-3xl font-semibold text-blue @min-[40rem]:text-3xl @min-[64rem]:w-80 @min-[64rem]:text-5xl">
                {timeRange(e.start, e.end)}
              </span>
              <span className="min-w-0">
                <span className="font-body block text-3xl font-semibold leading-tight @min-[40rem]:text-3xl @min-[64rem]:text-5xl">
                  {e.name}
                </span>
                {e.location && (
                  <span className="font-body mt-1 flex items-center gap-2 text-2xl text-ink/70 @min-[40rem]:text-2xl @min-[64rem]:text-3xl">
                    <MapPin size={30} strokeWidth={2} aria-hidden="true" />
                    {e.location}
                  </span>
                )}
              </span>
              {i % 2 === 1 && (
                <span className="ml-auto hidden h-3 w-3 shrink-0 bg-teal @min-[64rem]:block" />
              )}
            </motion.li>
          ))}
        </motion.ul>
      )}
    </InfoPageShell>
  );
}
