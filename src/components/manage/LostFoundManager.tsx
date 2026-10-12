"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_EXPIRY_DAYS,
  EXPIRY_CHOICES,
  LOST_FOUND_LIMITS,
  addLostItem,
  deleteLostItem,
  purgeExpiredLostFound,
  shortDate,
  translateItem,
} from "@/lib/lostFound";
import { reloadLostFound, useLostFound } from "@/lib/useLostFound";
import { localYmd } from "@/lib/bilingualDates";
import type { BulletinLocation } from "@/lib/bulletinLocations";
import { CharCount, inputClass, labelClass, smallBtn } from "./editorFields";

/*
  Staff list for a "Lost & found" slide. Items live in their own table
  (lib/lostFound), not in the slide, so they are added and removed here
  directly — they never wait for "Save slide". Each item picks its building
  (it only shows on that building's screens) and how long it stays up; the
  Spanish is filled in automatically when it is added.
*/
export default function LostFoundManager({ locations }: { locations: BulletinLocation[] }) {
  const items = useLostFound(true);
  const [locationId, setLocationId] = useState("");
  const [days, setDays] = useState<number>(DEFAULT_EXPIRY_DAYS);
  const [item, setItem] = useState("");
  const [foundOn, setFoundOn] = useState(() => localYmd());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Expired rows are already invisible; this deletes them for good.
  useEffect(() => {
    purgeExpiredLostFound();
  }, []);

  const canAdd = Boolean(locationId && item.trim() && foundOn);

  async function add() {
    if (!canAdd) return;
    setBusy(true);
    setMessage(null);
    const { es, warning } = await translateItem(item.trim());
    const err = await addLostItem(item, es, foundOn, locationId, days);
    setBusy(false);
    if (err) {
      setMessage(`Not added: ${err}`);
      return;
    }
    setItem("");
    setMessage(warning ?? "Added. It shows on that building's screens within a few seconds.");
    reloadLostFound();
  }

  async function remove(id: string) {
    const err = await deleteLostItem(id);
    setMessage(err ? `Not removed: ${err}` : null);
    reloadLostFound();
  }

  const list = [...(items ?? [])].sort((a, b) => b.foundOn.localeCompare(a.foundOn));
  const locationName = (id: string) => locations.find((l) => l.id === id)?.name ?? "Unknown location";
  const until = (iso: string) =>
    new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));

  return (
    <div className="space-y-4">
      <p className="border-l-4 border-blue pl-3 text-sm text-ink/80">
        Items show on that building&rsquo;s wall screens, and anyone with that
        building&rsquo;s bulletin link can see them. Describe the item only, with
        no owner&rsquo;s name or ID details. Items are saved the moment you add
        them and come down on their own.
      </p>

      <fieldset className="space-y-3 border-2 border-placeholder p-3">
        <legend className="px-1 text-base font-bold text-blue">Add a found item</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block min-w-0">
            <span className={labelClass}>Location</span>
            <select
              className={inputClass}
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="">Choose a building…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className={labelClass}>Take down after</span>
            <select
              className={inputClass}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              {EXPIRY_CHOICES.map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <label className="block min-w-0">
            <span className={labelClass}>Item</span>
            <span className="block text-sm text-ink/60">e.g. Black backpack, blue reading glasses</span>
            <input
              className={inputClass}
              value={item}
              autoComplete="off"
              maxLength={LOST_FOUND_LIMITS.item}
              onChange={(e) => setItem(e.target.value)}
            />
            <CharCount value={item} max={LOST_FOUND_LIMITS.item} />
          </label>
          <label className="block min-w-0">
            <span className={labelClass}>Found on</span>
            <input
              type="date"
              className={inputClass}
              value={foundOn}
              max={localYmd()}
              onChange={(e) => setFoundOn(e.target.value)}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={add}
            disabled={!canAdd || busy}
            className="border-2 border-blue bg-blue px-5 py-2 text-base font-semibold text-paper hover:bg-paper hover:text-blue disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add item"}
          </button>
          {message && (
            <span role="status" className="text-sm font-semibold text-ink/80">
              {message}
            </span>
          )}
        </div>
      </fieldset>

      <div>
        <p className={labelClass}>Items up now ({list.length})</p>
        {items === null ? (
          <p className="text-sm text-ink/60">Loading…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-ink/60">
            None. The slide sits out of the rotation until an item is added.
          </p>
        ) : (
          <ul className="mt-2 divide-y-2 divide-placeholder border-2 border-placeholder">
            {list.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2">
                <span className="min-w-0 flex-1 font-semibold">
                  {e.item} · found {shortDate(e.foundOn)}
                </span>
                <span className="text-sm text-ink/60">
                  {locationName(e.locationId)} · until {until(e.expiresAt)}
                </span>
                <button type="button" className={smallBtn} onClick={() => remove(e.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
