"use client";

import { useState } from "react";

/*
  "Hide slide": the switch at the very top of every open bulletin panel, custom
  slides and built-in pages alike. Saves the moment it is clicked (like
  reordering), not with a panel's Save button, through whichever write the
  caller passes in (setSlidePaused or setPagePaused). The checked state comes
  back from the database through the caller's reload, never from here.
*/
export default function HideSlideToggle({
  paused,
  onChange,
}: {
  paused: boolean;
  onChange: (paused: boolean) => Promise<string | null>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    const err = await onChange(!paused);
    setBusy(false);
    if (err) setError(`Not saved: ${err}`);
  }

  return (
    <div>
      <label
        className={`flex min-h-12 cursor-pointer items-center gap-3 border-2 px-3 py-2 text-base font-semibold ${
          paused ? "border-ink bg-ink/5 text-ink" : "border-ink/30 hover:border-blue"
        }`}
      >
        <input
          type="checkbox"
          className="h-5 w-5 accent-blue"
          checked={paused}
          disabled={busy}
          onChange={toggle}
        />
        <span>
          Hide slide
          <span className="block text-sm font-normal text-ink/60">
            {paused
              ? "Hidden from every screen. Uncheck to show it again."
              : "Takes this slide off every screen without deleting it."}
          </span>
        </span>
      </label>
      {error && (
        <p role="alert" className="mt-2 text-base font-semibold text-blue">
          {error}
        </p>
      )}
    </div>
  );
}

// The marker on a collapsed panel header while its slide is hidden.
export function HiddenLabel() {
  return (
    <span className="shrink-0 whitespace-nowrap bg-ink/60 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-paper">
      Hidden
    </span>
  );
}
