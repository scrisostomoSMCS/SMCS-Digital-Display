"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Check,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  createBulletinLocation,
  deleteBulletinLocation,
  fetchBulletinLocations,
  fetchBulletinPageLocations,
  locationSlug,
  type BulletinLocation,
  type BulletinPageLocationMap,
} from "@/lib/bulletinLocations";
import {
  fetchHiddenBuiltins,
  locationRotationIsEmpty,
  type BuiltinKey,
} from "@/lib/displaySettings";
import { fetchSlides, type Slide } from "@/lib/slides";
import {
  defaultInfoContent,
  fetchInfoContent,
  type InfoContent,
} from "@/lib/infoContent";
import { inputClass } from "./editorFields";

export default function BulletinLocationsManager() {
  const [locations, setLocations] = useState<BulletinLocation[]>([]);
  const [name, setName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  // Collapsed by default. Once the locations exist this panel is reference
  // material, but it sat permanently expanded above the bulletin pages and
  // pushed them down by roughly its own height on every visit.
  const [open, setOpen] = useState(false);
  /*
    Everything the empty-location check reads. Held here rather than derived
    from the bulletin itself: a location in this state still shows the built-ins
    on the TV (the display's last-resort fallback puts them back), so the only
    way to see that it is misconfigured is to read the saved config directly.
  */
  const [hidden, setHidden] = useState<BuiltinKey[]>([]);
  const [pageLocations, setPageLocations] = useState<BulletinPageLocationMap>({});
  const [slides, setSlides] = useState<Slide[]>([]);
  const [content, setContent] = useState<InfoContent>(defaultInfoContent);
  const [configLoaded, setConfigLoaded] = useState(false);

  const load = useCallback(async () => {
    setLocations(await fetchBulletinLocations());
    setLoaded(true);
  }, []);

  const loadConfig = useCallback(async () => {
    const [nextHidden, nextPageLocations, nextSlides, nextContent] =
      await Promise.all([
        fetchHiddenBuiltins(),
        fetchBulletinPageLocations(),
        fetchSlides(), // no slug: every visible slide, with its own targeting
        fetchInfoContent(),
      ]);
    setHidden(nextHidden);
    setPageLocations(nextPageLocations);
    setSlides(nextSlides);
    setContent(nextContent);
    setConfigLoaded(true);
  }, []);

  useEffect(() => {
    load();
    loadConfig();
    const channel = supabase
      .channel("bulletin-locations-manager")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bulletin_locations" },
        load,
      )
      // Every table the banner condition depends on, so a hide/unhide or a
      // targeting change on another part of the manage page updates it live.
      .on("postgres_changes", { event: "*", schema: "public", table: "display_settings" }, loadConfig)
      .on("postgres_changes", { event: "*", schema: "public", table: "slides" }, loadConfig)
      .on("postgres_changes", { event: "*", schema: "public", table: "slide_locations" }, loadConfig)
      .on("postgres_changes", { event: "*", schema: "public", table: "builtin_page_locations" }, loadConfig)
      .on("postgres_changes", { event: "*", schema: "public", table: "info_content" }, loadConfig)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, loadConfig]);

  // The sidebar links here by hash, so open before the browser scrolls to it.
  useEffect(() => {
    const onHash = () => {
      if (location.hash === "#display-locations") setOpen(true);
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

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

  // Suppressed until the config has actually arrived, so a slow query cannot
  // flash a red banner on a perfectly healthy location.
  const isEmpty = (location: BulletinLocation) =>
    configLoaded &&
    locationRotationIsEmpty({
      locationId: location.id,
      hidden,
      pageLocations,
      slides,
      content,
    });

  return (
    <section
      id="display-locations"
      className="scroll-mt-8 border-2 border-placeholder"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left hover:bg-ink/5 lg:p-6"
      >
        <span aria-hidden="true" className="mt-1 text-lg text-ink/50">
          {open ? "▾" : "▸"}
        </span>
        <Building2 className="mt-1 shrink-0 text-teal" size={30} aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="text-2xl font-bold text-blue">
            Display locations
            {!open && loaded && (
              <span className="ml-3 text-base font-semibold text-ink/50">
                {locations.length === 0
                  ? "None yet"
                  : `${locations.length} location${locations.length === 1 ? "" : "s"}`}
              </span>
            )}
          </h3>
          <p className="mt-1 max-w-3xl text-base text-ink/70">
            Give each building its own bulletin URL. Pages and slides set to All
            locations appear on every screen; targeted content appears only at
            the locations you choose.
          </p>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 lg:px-6 lg:pb-6">
        <form
          onSubmit={addLocation}
          className="grid items-end gap-3 border-y-2 border-placeholder bg-ink/5 p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
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
                {isEmpty(location) && (
                  <p
                    role="alert"
                    className="mt-3 flex items-start gap-2 border-2 border-red bg-red/5 px-3 py-2 text-sm font-semibold text-red"
                  >
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                      This location is showing default information. None of
                      its own slides or pages are set to appear here. Add a
                      slide, or restore a page under “Recently deleted”.
                    </span>
                  </p>
                )}
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
        </div>
      )}
    </section>
  );
}
