import type { ReactNode } from "react";

/*
  Shared frame for every rotating page: consistent SMCS branding + a large
  heading, so the three pages read as one cohesive wall display. Fills the
  full height it's given by the rotation controller.
*/
type InfoPageShellProps = {
  title: string;
  children: ReactNode;
};

export default function InfoPageShell({ title, children }: InfoPageShellProps) {
  return (
    <div className="flex h-full flex-col bg-paper px-10 py-10 md:px-20 md:py-14">
      <header className="shrink-0 border-b-4 border-teal pb-5">
        <p className="text-xl font-semibold uppercase tracking-widest text-blue md:text-2xl">
          Saint Mary&rsquo;s Care Services
        </p>
        <h1 className="mt-2 text-5xl font-bold md:text-7xl">{title}</h1>
      </header>
      <div className="min-h-0 flex-1 pt-8 md:pt-12">{children}</div>
    </div>
  );
}
