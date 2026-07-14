"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/*
  Primary page navigation, below the teal top bar on every (site) page.
  On the home page it overlays the hero image (transparent, absolutely
  positioned) so the photo shows behind the links; on every other page it's a
  solid blue bar. (Auth-aware links live in the top bar via AuthNav.)
*/
const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/#about" },
  { label: "Services", href: "/#services" },
  { label: "Live Calendar", href: "/dashboard" },
  { label: "Digital Schedule", href: "/information" },
];

export default function NavBar() {
  const pathname = usePathname();
  const overlay = pathname === "/";

  return (
    <nav
      className={
        overlay
          ? "absolute inset-x-0 top-0 z-20 text-paper"
          : "bg-blue text-paper"
      }
    >
      <ul className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 px-4 py-1.5">
        {navLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-block px-4 py-2 text-lg font-semibold text-paper hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
