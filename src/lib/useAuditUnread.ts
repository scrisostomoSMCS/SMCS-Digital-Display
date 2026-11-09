"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { AUDIT_LOGS_SEEN_EVENT, fetchAuditUnreadCount } from "./auditLogs";

/*
  The Logs badge count for the signed-in admin. Off (always 0, no queries, no
  channel) when `enabled` is false, so non-admins never touch audit_logs.

  The count is of GROUPS (one multi-row save is one), as the Logs table shows
  them. A fresh count on mount, then Realtime: every new audit_logs row
  triggers a full recount through fetchAuditUnreadCount rather than adding up
  events here, so the "not my own changes", "since I last looked" and grouping
  rules live in one place. Debounced because one save can write several rows.
  RLS on audit_logs means only admins receive these events at all.

  Also recounts when the tab comes back into view, which covers a Realtime
  connection that dropped while the laptop slept, and when the Logs screen
  marks everything seen.
*/
const RECOUNT_DELAY = 400;

export function useAuditUnread(enabled: boolean): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const recount = async () => {
      const next = await fetchAuditUnreadCount();
      // null = the call failed: keep showing what we had.
      if (!cancelled && next !== null) setCount(next);
    };
    const scheduleRecount = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(recount, RECOUNT_DELAY);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") recount();
    };

    recount();
    const channel = supabase
      .channel("audit-logs-badge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_logs" },
        scheduleRecount,
      )
      .subscribe();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(AUDIT_LOGS_SEEN_EVENT, recount);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(AUDIT_LOGS_SEEN_EVENT, recount);
    };
  }, [enabled]);

  return enabled ? count : 0;
}
