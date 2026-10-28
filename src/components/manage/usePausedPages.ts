"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchPausedPages, PAUSED_PAGES_EVENT } from "@/lib/displaySettings";

/*
  The built-in page keys staff have paused with "Hide slide", kept live the same
  way as useSidebarNames: realtime for other staff members' changes,
  PAUSED_PAGES_EVENT for this tab's own.
*/
export function usePausedPages(channelKey: string): string[] {
  const [paused, setPaused] = useState<string[]>([]);

  const load = useCallback(async () => {
    const next = await fetchPausedPages();
    if (next) setPaused(next);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`paused-pages-${channelKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "display_settings" },
        load,
      )
      .subscribe();
    window.addEventListener(PAUSED_PAGES_EVENT, load);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener(PAUSED_PAGES_EVENT, load);
    };
  }, [load, channelKey]);

  return paused;
}
