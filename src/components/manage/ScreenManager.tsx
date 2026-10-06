"use client";

import { useEffect, useState } from "react";
import { Check, Copy, MonitorCog, Pencil, Plus, Trash2 } from "lucide-react";
import {
  fetchBulletinLocations,
  locationSlug,
  type BulletinLocation,
} from "@/lib/bulletinLocations";
import {
  SCREEN_ID_PATTERN,
  createScreen,
  deleteScreen,
  updateScreen,
  type Screen,
} from "@/lib/screens";
import { inputClass, labelClass, smallBtn } from "./editorFields";

/*
  Register, rename, relocate, and remove bulletin TVs, so staff never need the
  database to add a screen. Lives under the health table and is handed its
  screens + a reload by ScreenHealth, so the table and this list never disagree.

  The screen ID is fixed once created: it is baked into that TV's Yodeck URL,
  and changing it here would silently orphan the TV. To change it, remove and
  re-add (and update the URL in Yodeck).
*/

// The URL a TV should load: its location's rotation (if any) plus its ID.
function screenPath(screen: Pick<Screen, "id" | "locationId">, locations: BulletinLocation[]) {
  const slug = locations.find((l) => l.id === screen.locationId)?.slug;
  const params = new URLSearchParams();
  if (slug) params.set("location", slug);
  params.set("screen", screen.id);
  return `/information?${params.toString()}`;
}

function LocationSelect({
  value,
  onChange,
  locations,
}: {
  value: string;
  onChange: (value: string) => void;
  locations: BulletinLocation[];
}) {
  return (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">No location (all slides)</option>
      {locations.map((l) => (
        <option key={l.id} value={l.id}>
          {l.name}
        </option>
      ))}
    </select>
  );
}

export default function ScreenManager({
  screens,
  onChanged,
}: {
  screens: Screen[];
  onChanged: () => Promise<void>;
}) {
  const [locations, setLocations] = useState<BulletinLocation[]>([]);
  // Open by default only when there is nothing to monitor yet; afterwards the
  // health table is the point of the page and this is occasional upkeep.
  const [open, setOpen] = useState(screens.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Add form. The ID follows the name until the ID box is edited by hand.
  const [newName, setNewName] = useState("");
  const [newId, setNewId] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const [adding, setAdding] = useState(false);

  // Inline edit, one screen at a time.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBulletinLocations().then(setLocations);
  }, []);

  const effectiveId = idTouched ? newId.trim().toLowerCase() : locationSlug(newName);
  const idIsValid = SCREEN_ID_PATTERN.test(effectiveId) && effectiveId.length <= 64;
  const idTaken = screens.some((s) => s.id === effectiveId);

  async function addScreen(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    const nextError = await createScreen({
      id: effectiveId,
      name: newName,
      locationId: newLocation || null,
    });
    setAdding(false);
    if (nextError) {
      setError(nextError);
      return;
    }
    setNewName("");
    setNewId("");
    setIdTouched(false);
    setNewLocation("");
    await onChanged();
  }

  function startEdit(screen: Screen) {
    setError(null);
    setEditingId(screen.id);
    setEditName(screen.name);
    setEditLocation(screen.locationId ?? "");
  }

  async function saveEdit(id: string) {
    setSaving(true);
    setError(null);
    const nextError = await updateScreen(id, {
      name: editName,
      locationId: editLocation || null,
    });
    setSaving(false);
    if (nextError) {
      setError(nextError);
      return;
    }
    setEditingId(null);
    await onChanged();
  }

  async function removeScreen(screen: Screen) {
    if (
      !window.confirm(
        `Remove “${screen.name}” (${screen.id})? It will stop appearing on this page. The TV itself keeps showing the bulletin normally.`,
      )
    )
      return;
    setError(null);
    const nextError = await deleteScreen(screen.id);
    if (nextError) {
      setError(nextError);
      return;
    }
    if (editingId === screen.id) setEditingId(null);
    await onChanged();
  }

  async function copyUrl(screen: Screen) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${screenPath(screen, locations)}`,
      );
      setCopied(screen.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Could not copy the URL. Select it and copy it by hand.");
    }
  }

  const sorted = [...screens].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="mt-10 border-2 border-placeholder">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left hover:bg-ink/5 lg:p-6"
      >
        <span aria-hidden="true" className="mt-1 text-lg text-ink/50">
          {open ? "▾" : "▸"}
        </span>
        <MonitorCog className="mt-1 shrink-0 text-teal" size={30} aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="text-2xl font-bold text-blue">
            Manage screens
            {!open && (
              <span className="ml-3 text-base font-semibold text-ink/50">
                {screens.length === 0
                  ? "None yet"
                  : `${screens.length} screen${screens.length === 1 ? "" : "s"}`}
              </span>
            )}
          </h3>
          <p className="mt-1 max-w-3xl text-base text-ink/70">
            Register each TV, then paste its URL into Yodeck. A TV only appears
            above once it is registered here and loading its URL.
          </p>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 lg:px-6 lg:pb-6">
          <form
            onSubmit={addScreen}
            className="grid items-end gap-3 border-y-2 border-placeholder bg-ink/5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <label className="block">
              <span className={labelClass}>Screen name</span>
              <input
                className={inputClass}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Main Lobby TV"
                maxLength={80}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Screen ID</span>
              <input
                className={inputClass}
                value={idTouched ? newId : effectiveId}
                onChange={(e) => {
                  setIdTouched(true);
                  setNewId(e.target.value);
                }}
                placeholder="lobby-1"
                maxLength={64}
                spellCheck={false}
                autoCapitalize="none"
              />
            </label>
            <label className="block">
              <span className={labelClass}>Location</span>
              <LocationSelect value={newLocation} onChange={setNewLocation} locations={locations} />
            </label>
            <button
              type="submit"
              disabled={adding || !newName.trim() || !idIsValid || idTaken}
              className="flex min-h-11 items-center justify-center gap-2 border-2 border-blue bg-blue px-5 py-2 text-base font-semibold text-paper hover:bg-paper hover:text-blue disabled:opacity-50"
            >
              <Plus size={20} aria-hidden="true" />
              {adding ? "Adding…" : "Add screen"}
            </button>
            <p className="break-all text-sm text-ink/60 lg:col-span-4">
              {effectiveId && !idIsValid
                ? "Screen ID can use lowercase letters, numbers, and single hyphens, like lobby-1."
                : idTaken
                  ? "A screen with that ID already exists."
                  : effectiveId
                    ? `Yodeck URL: ${screenPath({ id: effectiveId, locationId: newLocation || null }, locations)}`
                    : "The ID is part of this TV's Yodeck URL and can't be changed later."}
            </p>
          </form>

          {error && (
            <p
              role="alert"
              className="mt-4 border-l-4 border-blue bg-blue/5 px-3 py-2 text-base font-semibold text-blue"
            >
              {error}
            </p>
          )}

          {sorted.length === 0 ? (
            <p className="mt-5 text-base text-ink/60">No screens yet.</p>
          ) : (
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {sorted.map((screen) => (
                <li key={screen.id} className="border-2 border-placeholder p-4">
                  {editingId === screen.id ? (
                    <div className="space-y-3">
                      <p className="text-sm text-ink/60">
                        ID: <span className="font-semibold text-ink">{screen.id}</span> (can&rsquo;t be changed)
                      </p>
                      <label className="block">
                        <span className={labelClass}>Screen name</span>
                        <input
                          className={inputClass}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          maxLength={80}
                        />
                      </label>
                      <label className="block">
                        <span className={labelClass}>Location</span>
                        <LocationSelect
                          value={editLocation}
                          onChange={setEditLocation}
                          locations={locations}
                        />
                      </label>
                      {editLocation !== (screen.locationId ?? "") && (
                        <p className="text-sm font-semibold text-blue">
                          Changing the location changes this TV&rsquo;s URL. Update
                          it in Yodeck after saving.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(screen.id)}
                          disabled={saving || !editName.trim()}
                          className="min-h-11 border-2 border-blue bg-blue px-4 py-1 text-sm font-semibold text-paper hover:bg-paper hover:text-blue disabled:opacity-50 lg:min-h-0"
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className={smallBtn}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-lg font-bold text-ink">{screen.name}</p>
                          <p className="text-base text-ink/70">
                            {screen.locationName ?? "No location"}
                          </p>
                          <p className="mt-1 break-all text-sm text-ink/60">
                            {screenPath(screen, locations)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeScreen(screen)}
                          className="shrink-0 p-2 text-ink/50 hover:bg-ink/5 hover:text-blue"
                          aria-label={`Remove ${screen.name}`}
                          title="Remove screen"
                        >
                          <Trash2 size={20} aria-hidden="true" />
                        </button>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => copyUrl(screen)}
                          className="flex min-h-11 items-center gap-2 border-2 border-blue px-3 py-2 text-sm font-semibold text-blue hover:bg-blue hover:text-paper lg:min-h-0"
                        >
                          {copied === screen.id ? (
                            <Check size={18} aria-hidden="true" />
                          ) : (
                            <Copy size={18} aria-hidden="true" />
                          )}
                          {copied === screen.id ? "Copied" : "Copy URL"}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(screen)}
                          className="flex min-h-11 items-center gap-2 border-2 border-ink/30 px-3 py-2 text-sm font-semibold text-ink hover:border-blue hover:text-blue lg:min-h-0"
                        >
                          <Pencil size={18} aria-hidden="true" />
                          Edit
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
