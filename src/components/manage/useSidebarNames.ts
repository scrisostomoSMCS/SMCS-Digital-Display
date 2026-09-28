"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  fetchSidebarNames,
  SIDEBAR_NAMES_EVENT,
  type SidebarNames,
} from "@/lib/displaySettings";

/*
  The staff-chosen names from the sidebar's double-click rename, kept live so
  the manage page's panel headings match the sidebar. Reloads on realtime
  (another staff member renamed something) and on SIDEBAR_NAMES_EVENT (this tab
  just renamed something, so it does not have to wait for realtime).
*/
export function useSidebarNames(channelKey: string): SidebarNames {
  const [names, setNames] = useState<SidebarNames>({});

  const load = useCallback(async () => {
    setNames(await fetchSidebarNames());
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`sidebar-names-${channelKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "display_settings" },
        load,
      )
      .subscribe();
    window.addEventListener(SIDEBAR_NAMES_EVENT, load);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener(SIDEBAR_NAMES_EVENT, load);
    };
  }, [load, channelKey]);

  return names;
}
