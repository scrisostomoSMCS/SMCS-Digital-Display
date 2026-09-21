"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ANNOUNCEMENT_MAX_LENGTH,
  ANNOUNCEMENT_WARN_LENGTH,
  endAnnouncement,
  fetchLiveAnnouncement,
  formatRemaining,
  pushAnnouncement,
  remainingMs,
  type Announcement,
} from "@/lib/announcements";
import DepthButton from "./DepthButton";

/*
  "Announcement Details". Follows the manage page's existing dialog shape (see
  EventForm): a fixed scrim that closes on click, a bordered paper panel that
  stops propagation, Escape to close.

  Two jobs: show whatever is live right now with a countdown and a way to end
  it, and push a new one. Pushing replaces the live one — the database does that
  swap atomically (migration 0022), so there is never a moment where two screens
  disagree about which announcement is current.
*/
const inputClass =
  "mt-1 w-full border-2 border-ink/30 px-3 py-2 text-base focus:border-blue focus:outline-none";

export default function AnnouncementModal({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [live, setLive] = useState<Announcement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Drives the countdown. Ticking a timestamp rather than a seconds-remaining
  // number keeps the countdown honest if the tab is throttled or backgrounded:
  // it recomputes from expires_at each tick instead of decrementing.
  const [now, setNow] = useState(() => Date.now());

  const loadLive = async () => setLive(await fetchLiveAnnouncement());

  useEffect(() => {
    loadLive();
    // Another staff member pushing or ending one while this modal is open.
    const channel = supabase
      .channel("manage-announcements")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        loadLive,
      )
      .subscribe();
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(tick);
      supabase.removeChannel(channel);
    };
  }, []);

  // Close on Escape, but never mid-request: the write is already on its way and
  // dropping the modal would hide whether it landed.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const left = live ? remainingMs(live, now) : 0;
  // Expired on the client between polls — stop showing a countdown at 0:00.
  const liveNow = live && left > 0 ? live : null;

  const trimmed = message.trim();
  const invalid = trimmed.length === 0 || message.length > ANNOUNCEMENT_MAX_LENGTH;
  const warn = message.length >= ANNOUNCEMENT_WARN_LENGTH;

  async function onPush() {
    // Cancel leaves the modal open with the text intact — nothing below runs.
    if (
      !window.confirm(
        "Are you sure? This will display on all screens for 5 minutes.",
      )
    )
      return;
    setSubmitting(true);
    setError(null);
    try {
      await pushAnnouncement(trimmed);
      // Cleared only on success, so a failed push never loses what was typed.
      setMessage("");
      await loadLive();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not push the announcement.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onEndNow() {
    if (
      !window.confirm(
        "End this announcement now? It will disappear from all screens.",
      )
    )
      return;
    setEnding(true);
    setError(null);
    try {
      await endAnnouncement();
      await loadLive();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not end the announcement.");
    } finally {
      setEnding(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3 lg:p-4"
      onClick={() => !submitting && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Announcement Details"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto border-4 border-blue bg-paper p-4 lg:max-h-none lg:overflow-visible lg:p-6"
      >
        <h2 className="text-2xl font-bold text-blue">Announcement Details</h2>
        <span className="mt-2 block h-1 w-16 bg-teal" />

        {/* What is on the screens right now, if anything. */}
        {liveNow && (
          <div className="mt-4 border-2 border-red bg-red/5 p-3">
            <p className="text-sm font-bold uppercase tracking-wide text-red">
              On screens now — {formatRemaining(left)} left
            </p>
            <p className="mt-1 text-base break-words">{liveNow.message}</p>
            <button
              type="button"
              onClick={onEndNow}
              disabled={ending}
              className="mt-3 border-2 border-red px-4 py-1.5 text-base font-semibold text-red hover:bg-red hover:text-paper disabled:opacity-60"
            >
              {ending ? "Ending…" : "End Now"}
            </button>
          </div>
        )}

        <label className="mt-4 block text-base font-semibold">
          Message
          <textarea
            className={inputClass}
            rows={4}
            value={message}
            maxLength={ANNOUNCEMENT_MAX_LENGTH}
            onChange={(e) => setMessage(e.target.value)}
            autoFocus
          />
        </label>
        <p
          className={`mt-1 text-right text-sm font-semibold ${
            warn ? "text-red" : "text-ink/50"
          }`}
          aria-live="polite"
        >
          {message.length}/{ANNOUNCEMENT_MAX_LENGTH}
        </p>

        <p className="mt-2 text-base font-semibold">
          This will display on all screens for 5 minutes.
        </p>
        {liveNow && (
          <p className="mt-1 text-base text-ink/70">
            Pushing this one replaces the announcement above straight away.
          </p>
        )}

        {error && (
          <p className="mt-3 border-l-4 border-red bg-red/10 py-2 pl-3 text-base">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {/* Disabled while the request is in flight, so a double click cannot
              produce two announcements. The database serializes concurrent
              pushes as well (advisory lock in push_announcement). */}
          <DepthButton
            tone="green"
            type="button"
            onClick={onPush}
            disabled={submitting || invalid}
          >
            {submitting ? "Pushing…" : "Push Out Announcement"}
          </DepthButton>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="border-2 border-ink/30 px-5 py-2 text-base font-semibold hover:border-ink disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
