/*
  Simple institutional footer.
*/
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t-4 border-teal bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-base">
          &copy; {year} SMCS. All rights reserved.
        </p>
        <p className="mt-2 text-base text-ink/70">
          This is a public information site.
        </p>
      </div>
    </footer>
  );
}
