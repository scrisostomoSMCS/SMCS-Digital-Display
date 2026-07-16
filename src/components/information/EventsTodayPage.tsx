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
      <div className="pointer-events-none absolute bottom-8 right-14 hidden lg:block">
        <RotatingLeaf size={150} className="text-teal/20" duration={24} />
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
        <h1 className="font-display mt-1 flex flex-wrap items-baseline gap-x-4 leading-none">
          <span className="text-3xl sm:text-4xl lg:text-6xl">Happening Today</span>
          <span className="text-xl text-ink/60 sm:text-2xl lg:text-4xl">Eventos de Hoy</span>
        </h1>
      </motion.header>

      {loaded && events.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-start justify-center overflow-y-auto py-4 lg:overflow-visible lg:py-0">
          <p className="font-display text-2xl text-blue sm:text-3xl lg:text-5xl">
            No events scheduled today.
          </p>
          <p className="font-display text-xl text-blue/70 sm:text-2xl lg:text-4xl">
            No hay eventos programados hoy.
          </p>
          <p className="font-body mt-6 max-w-3xl text-lg font-medium sm:text-xl lg:mt-10 lg:text-3xl">
            Our everyday services are still open, see the services list for
            what&rsquo;s always available.
          </p>
          <p className="font-body mt-2 max-w-3xl text-base font-medium text-ink/70 sm:text-lg lg:mt-1 lg:text-2xl">
            Nuestros servicios diarios siguen abiertos; consulte la lista de
            servicios para ver lo que siempre está disponible.
          </p>
        </div>
      ) : (
        <motion.ul
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="relative z-10 mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2 lg:mt-6 lg:gap-4 lg:overflow-hidden lg:pb-0"
        >
          {events.map((e, i) => (
            <motion.li
              key={e.id}
              variants={riseItem}
              className="flex flex-col items-start gap-1 border-l-4 border-blue bg-paper py-2 pl-3 lg:flex-row lg:items-center lg:gap-6 lg:border-l-8 lg:py-1 lg:pl-6"
            >
              {/* Big time block leads each row. */}
              <span className="font-body w-auto shrink-0 text-xl font-semibold text-blue sm:text-2xl lg:w-64 lg:text-4xl">
                {timeRange(e.start, e.end)}
              </span>
              <span className="min-w-0">
                <span className="font-body block text-xl font-semibold leading-tight sm:text-2xl lg:text-4xl">
                  {e.name}
                </span>
                {e.location && (
                  <span className="font-body mt-1 flex items-center gap-2 text-base text-ink/70 sm:text-lg lg:text-2xl">
                    <MapPin size={22} strokeWidth={2} aria-hidden="true" />
                    {e.location}
                  </span>
                )}
              </span>
              {i % 2 === 1 && (
                <span className="ml-auto hidden h-3 w-3 shrink-0 bg-teal lg:block" />
              )}
            </motion.li>
          ))}
        </motion.ul>
      )}
    </InfoPageShell>
  );
}
