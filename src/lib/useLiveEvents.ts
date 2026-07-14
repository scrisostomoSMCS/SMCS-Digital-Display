"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { DashboardEvent } from "./events";

/*
  Loads events once on mount, then re-loads whenever any of the given tables
  change (Supabase realtime). Shared by every calendar surface, each passes its
  own loader and the table(s) that affect its data:
    - Live Dashboard: fetchDashboardEvents, ["events"]
    - Personal Calendar: fetchMySchedule, ["signups", "events"]

  `load` and `tables` are expected to be stable per mount (module-level fn and a
  literal array), so the subscription is set up once.
*/
export function useLiveEvents(
  load: () => Promise<DashboardEvent[]>,
  tables: string[],
): DashboardEvent[] {
  const [events, setEvents] = useState<DashboardEvent[]>([]);

  useEffect(() => {
    let active = true;
    const run = () => {
      load().then((data) => {
        if (active) setEvents(data);
      });
    };
    run();

    const channel = supabase.channel(`live-events-${tables.join("-")}`);
    tables.forEach((table) =>
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        run,
      ),
    );
    channel.subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
    // load + tables are stable per mount; intentionally run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return events;
}
