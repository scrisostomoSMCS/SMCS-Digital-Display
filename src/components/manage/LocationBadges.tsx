"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  fetchBulletinLocations,
  type BulletinLocation,
} from "@/lib/bulletinLocations";

/*
  Header badges naming the display locations a slide or built-in page is
  targeted to, so the collapsed manage list is scannable. No targeting rows
  means the content shows everywhere ("All locations"). A collapsed panel keeps
  the header on one line by naming the first two locations and counting the
  rest; expanding the panel names them all.
*/

const COLLAPSED_MAX = 2;

const badgeClass =
  "shrink-0 whitespace-nowrap border border-teal px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-ink/60";

// Shared loader for the location list, kept live so a location renamed or
// deleted in Display locations updates every badge and picker on the page.
export function useBulletinLocations(channelKey: string): BulletinLocation[] {
  const [locations, setLocations] = useState<BulletinLocation[]>([]);

  const load = useCallback(async () => {
    setLocations(await fetchBulletinLocations());
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`bulletin-locations-${channelKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bulletin_locations" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, channelKey]);

  return locations;
}

export default function LocationBadges({
  locationIds,
  locations,
  expanded,
}: {
  locationIds: string[];
  locations: BulletinLocation[];
  expanded: boolean;
}) {
  const names = locationIds
    .map((id) => locations.find((l) => l.id === id)?.name)
    .filter((name): name is string => Boolean(name));

  // Targeted, but the names have not loaded yet: stay quiet rather than claim
  // "All locations", which is the opposite of the truth.
  if (locationIds.length > 0 && names.length === 0) return null;

  const shown = expanded ? names : names.slice(0, COLLAPSED_MAX);
  const remaining = names.length - shown.length;

  return (
    <span className="hidden min-w-0 flex-wrap items-center gap-1 sm:flex">
      {names.length === 0 ? (
        <span className={badgeClass}>All locations</span>
      ) : (
        <>
          {shown.map((name) => (
            <span key={name} className={badgeClass}>
              {name}
            </span>
          ))}
          {remaining > 0 && (
            <span className={badgeClass}>+{remaining} more</span>
          )}
        </>
      )}
    </span>
  );
}
