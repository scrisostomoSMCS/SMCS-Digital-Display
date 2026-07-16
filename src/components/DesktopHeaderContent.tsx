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
    <div
      className={`hidden items-stretch justify-between ${
        pathname === "/" ? "md:flex" : "lg:flex"
      }`}
    >
      {children}
    </div>
  );
}
