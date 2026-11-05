"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isManagePath } from "@/lib/manageSidebar";

export default function DesktopHeaderContent({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    // data-manage lets the logo block step aside for the manage sidebar's own.
    <div
      data-manage={isManagePath(pathname) ? "" : undefined}
      className={`group hidden items-stretch justify-between ${
        pathname === "/" ? "md:flex" : "lg:flex"
      }`}
    >
      {children}
    </div>
  );
}
