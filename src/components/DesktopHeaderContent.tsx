"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function DesktopHeaderContent({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    // data-manage lets the logo block step aside for the manage sidebar's own.
    <div
      data-manage={pathname === "/manage" ? "" : undefined}
      className={`group hidden items-stretch justify-between ${
        pathname === "/" ? "md:flex" : "lg:flex"
      }`}
    >
      {children}
    </div>
  );
}
