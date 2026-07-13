import Link from "next/link";

/*
  Primary page navigation, below the teal top bar on every (site) page.
  (Auth-aware links live in the top bar via AuthNav.)
*/
const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/#about" },
  { label: "Services", href: "/#services" },
  { label: "Live Dashboard", href: "/dashboard" },
  { label: "Information", href: "/information" },
];

export default function NavBar() {
  return (
    <nav className="border-b border-placeholder bg-paper">
      <ul className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 px-4 py-1.5">
        {navLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-block px-4 py-2 text-lg font-semibold text-ink hover:text-blue hover:underline focus-visible:text-blue"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
