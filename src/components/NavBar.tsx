import Link from "next/link";
import AuthNav from "@/components/auth/AuthNav";

/*
  Primary navigation, present on every (site) page. Static public links here;
  the auth-aware links (My Schedule / Log in / Log out) are rendered by AuthNav.
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
        {/* Push auth controls to the right */}
        <span className="ml-auto" />
        <AuthNav />
      </ul>
    </nav>
  );
}
