import Link from "next/link";

/*
  Primary navigation, present on every page via the root layout.
  "Live Dashboard" points to a placeholder route for now (Phase 2).
*/
const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/#about" },
  { label: "Services", href: "/#services" },
  { label: "Live Dashboard", href: "/dashboard" },
];

export default function NavBar() {
  return (
    <nav className="border-b-2 border-blue bg-paper">
      <ul className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-1 px-6 py-2">
        {navLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-block px-3 py-2 text-lg font-semibold text-ink hover:text-blue hover:underline focus-visible:text-blue"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
