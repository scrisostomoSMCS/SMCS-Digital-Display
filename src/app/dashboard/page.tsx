import Link from "next/link";
import Section from "@/components/Section";

export const metadata = {
  title: "Live Dashboard — Coming Soon | SMCS",
};

/*
  Placeholder route for the Phase 2 live dashboard.
*/
export default function DashboardPage() {
  return (
    <Section title="Live Dashboard">
      <div className="max-w-2xl">
        <p className="text-2xl font-semibold text-blue">Coming soon</p>
        <p className="mt-4 text-xl">
          The live dashboard is part of a later phase and is not available yet.
          Please check back soon.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block border-2 border-teal px-6 py-3 text-lg font-semibold text-teal hover:bg-teal hover:text-paper"
        >
          Back to Home
        </Link>
      </div>
    </Section>
  );
}
