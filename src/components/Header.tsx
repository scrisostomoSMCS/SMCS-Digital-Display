import Link from "next/link";

/*
  Site header with the SMCS name/logo placeholder.
  The square block stands in for a real logo to be supplied later.
*/
export default function Header() {
  return (
    <header className="border-b-4 border-teal bg-paper">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-5">
        <Link href="/" className="flex items-center gap-4">
          {/* Logo placeholder — replace with real logo asset in a later phase */}
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center border-2 border-blue text-lg font-bold text-blue"
          >
            LOGO
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-2xl font-bold tracking-tight">SMCS</span>
            <span className="text-base text-ink/70">Official Website</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
