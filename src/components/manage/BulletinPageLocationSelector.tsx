"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchBulletinLocations,
  fetchBulletinPageLocations,
  setBulletinPageLocations,
  type BulletinLocation,
} from "@/lib/bulletinLocations";
import { supabase } from "@/lib/supabase";
import { labelClass } from "./editorFields";

export default function BulletinPageLocationSelector({
  pageKey,
}: {
  pageKey: string;
}) {
  const [locations, setLocations] = useState<BulletinLocation[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [nextLocations, assignments] = await Promise.all([
      fetchBulletinLocations(),
      fetchBulletinPageLocations(),
    ]);
    setLocations(nextLocations);
    setSelected(assignments[pageKey] ?? []);
    setLoaded(true);
  }, [pageKey]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`builtin-page-locations-${pageKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bulletin_locations" },
        load,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "builtin_page_locations" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, pageKey]);

  async function choose(next: string[]) {
    setSaving(true);
    setError(null);
    const nextError = await setBulletinPageLocations(pageKey, next);
    setSaving(false);
    if (nextError) {
      setError(nextError);
      return;
    }
    setSelected(next);
  }

  if (!loaded) {
    return <p className="text-base text-ink/60">Loading display locations…</p>;
  }

  return (
    <fieldset className="border-b-2 border-blue/20 pb-5">
      <legend className={labelClass}>Display locations</legend>
      <p className="text-sm text-ink/60">
        This setting saves automatically. Choose All locations, or select one or
        more specific buildings.
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <button
          type="button"
          disabled={saving}
          aria-pressed={selected.length === 0}
          onClick={() => choose([])}
          className={`min-h-12 border-2 px-3 py-2 text-left text-base font-semibold disabled:opacity-60 ${
            selected.length === 0
              ? "border-blue bg-blue/5 text-blue"
              : "border-ink/30 hover:border-blue"
          }`}
        >
          All locations
        </button>
        {locations.map((location) => {
          const checked = selected.includes(location.id);
          return (
            <label
              key={location.id}
              className={`flex min-h-12 items-center gap-3 border-2 px-3 py-2 text-base font-semibold ${
                saving ? "cursor-wait opacity-60" : "cursor-pointer"
              } ${
                checked
                  ? "border-blue bg-blue/5 text-blue"
                  : "border-ink/30 hover:border-blue"
              }`}
            >
              <input
                type="checkbox"
                className="h-5 w-5 accent-blue"
                disabled={saving}
                checked={checked}
                onChange={() =>
                  choose(
                    checked
                      ? selected.filter((id) => id !== location.id)
                      : [...selected, location.id],
                  )
                }
              />
              {location.name}
            </label>
          );
        })}
      </div>
      {locations.length === 0 && (
        <p className="mt-2 text-sm text-ink/60">
          No locations have been added yet, so this page appears everywhere.
        </p>
      )}
      {saving && <p className="mt-2 text-sm font-semibold text-blue">Saving…</p>}
      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-blue">
          Couldn’t save locations: {error}
        </p>
      )}
    </fieldset>
  );
}
