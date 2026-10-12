"use client";

import { createContext, useContext, type ReactNode } from "react";

/*
  Which bulletin a slide is being drawn for. Only location-bound content (lost
  & found) needs to know.

    { kind: "preview" }               the manage page's previews: no location
                                      of their own, so show every location's
                                      items (staff only ever see this);
    { kind: "screen", locationId }    the live /information display; null when
                                      the URL has no ?location= or names an
                                      unknown one, which shows none.

  Defaults to preview, so a renderer used outside InformationDisplay can never
  quietly behave like a wall screen.
*/
export type BulletinScope =
  | { kind: "preview" }
  | { kind: "screen"; locationId: string | null };

const BulletinScopeContext = createContext<BulletinScope>({ kind: "preview" });

export function BulletinScopeProvider({
  value,
  children,
}: {
  value: BulletinScope;
  children: ReactNode;
}) {
  return <BulletinScopeContext.Provider value={value}>{children}</BulletinScopeContext.Provider>;
}

export const useBulletinScope = () => useContext(BulletinScopeContext);

// The itemsFor() scope for this bulletin, or null when it shows none.
export function lostFoundScope(scope: BulletinScope): string | "all" | null {
  return scope.kind === "preview" ? "all" : scope.locationId;
}
