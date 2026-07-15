import Link from "next/link";

/*
  Left navigation for the full-screen admin layout (blue, like the mockup).
  The admin page lives outside the (site) route group, so it has no top bar;
  this sidebar is its navigation back into the rest of the app.
*/
const NAV = [
  { label: "Home", href: "/" },
  { label: "Live Calendar", href: "/dashboard" },
  { label: "My Schedule", href: "/schedule" },
  { label: "Manage", href: "/manage" },
];

export default function AdminSidebar() {
  return (
    <aside className="w-56 shrink-0 bg-blue text-paper">
      <div className="sticky top-0 flex h-screen flex-col">
        {/* White logo block flush to the top and side edges of the sidebar */}
        <Link
          href="/"
          className="block w-full bg-paper py-5 text-center text-lg font-bold tracking-tight text-blue"
          aria-label="SMCS home"
        >
          SMCS LOGO
        </Link>
        <nav aria-label="Admin navigation" className="mt-6 flex flex-col">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="border-l-4 border-transparent px-4 py-3 text-lg font-semibold text-paper hover:border-paper hover:bg-white/10"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
