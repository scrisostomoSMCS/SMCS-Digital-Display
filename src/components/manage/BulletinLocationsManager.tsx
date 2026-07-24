"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Check, Copy, ExternalLink, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  createBulletinLocation,
  deleteBulletinLocation,
  fetchBulletinLocations,
  locationSlug,
  type BulletinLocation,
} from "@/lib/bulletinLocations";
import { inputClass } from "./editorFields";

export default function BulletinLocationsManager() {
  const [locations, setLocations] = useState<BulletinLocation[]>([]);
  const [name, setName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLocations(await fetchBulletinLocations());
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("bulletin-locations-manager")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bulletin_locations" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const displayUrl = (slug: string) =>
    `${window.location.origin}/information?location=${encodeURIComponent(slug)}`;

  async function addLocation(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const nextError = await createBulletinLocation(name);
    setSaving(false);
    if (nextError) {
      setError(nextError);
      return;
    }
    setName("");
    await load();
  }

  async function copyUrl(location: BulletinLocation) {
    try {
      await navigator.clipboard.writeText(displayUrl(location.slug));
      setCopied(location.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Could not copy the URL. Open the display and copy it from the address bar.");
    }
  }

  async function removeLocation(location: BulletinLocation) {
    if (!window.confirm(`Delete the location “${location.name}”?`)) return;
    setError(null);
    const nextError = await deleteBulletinLocation(location.id);
    if (nextError) setError(nextError);
  }

  const previewSlug = locationSlug(name);

  return (
    <section
      id="display-locations"
      className="scroll-mt-8 border-2 border-placeholder p-4 lg:p-6"
    >
      <div className="flex items-start gap-3">
        <Building2 className="mt-1 shrink-0 text-teal" size={30} aria-hidden="true" />
        <div>
          <h3 className="text-2xl font-bold text-blue">Display locations</h3>
          <p className="mt-1 max-w-3xl text-base text-ink/70">
            Give each building its own bulletin URL. Pages and slides set to All
            locations appear on every screen; targeted content appears only at
            the locations you choose.
          </p>
        </div>
      </div>

      <form
        onSubmit={addLocation}
        className="mt-6 grid items-end gap-3 border-y-2 border-placeholder bg-ink/5 p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
      >
        <label className="block">
          <span className="block text-base font-semibold">Add a location</span>
          <span className="block text-sm text-ink/60">
            Use the building or screen area name, such as Dining Room.
          </span>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dining Room"
            maxLength={80}
          />
          {previewSlug && (
            <span className="mt-1 block break-all text-sm text-ink/60">
              URL ending: /information?location={previewSlug}
            </span>
          )}
        </label>
        <button
          type="submit"
          disabled={saving || !previewSlug}
          className="flex min-h-11 items-center justify-center gap-2 border-2 border-blue bg-blue px-5 py-2 text-base font-semibold text-paper hover:bg-paper hover:text-blue disabled:opacity-50"
        >
          <Plus size={20} aria-hidden="true" />
          {saving ? "Adding…" : "Add location"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-4 border-l-4 border-blue bg-blue/5 px-3 py-2 text-base font-semibold text-blue">
          {error}
        </p>
      )}

      {loaded && locations.length === 0 ? (
        <p className="mt-5 text-base text-ink/60">
          No locations yet. The current /information page continues to show all slides.
        </p>
      ) : (
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {locations.map((location) => (
            <li key={location.id} className="border-2 border-placeholder p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-bold text-ink">{location.name}</p>
                  <p className="mt-1 break-all text-sm text-ink/60">
                    /information?location={location.slug}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeLocation(location)}
                  className="shrink-0 p-2 text-ink/50 hover:bg-ink/5 hover:text-blue"
                  aria-label={`Delete ${location.name}`}
                  title="Delete location"
                >
                  <Trash2 size={20} aria-hidden="true" />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyUrl(location)}
                  className="flex min-h-11 items-center gap-2 border-2 border-blue px-3 py-2 text-sm font-semibold text-blue hover:bg-blue hover:text-paper lg:min-h-0"
                >
                  {copied === location.id ? (
                    <Check size={18} aria-hidden="true" />
                  ) : (
                    <Copy size={18} aria-hidden="true" />
                  )}
                  {copied === location.id ? "Copied" : "Copy URL"}
                </button>
                <a
                  href={`/information?location=${encodeURIComponent(location.slug)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-11 items-center gap-2 border-2 border-ink/30 px-3 py-2 text-sm font-semibold text-ink hover:border-blue hover:text-blue lg:min-h-0"
                >
                  <ExternalLink size={18} aria-hidden="true" />
                  Preview
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
