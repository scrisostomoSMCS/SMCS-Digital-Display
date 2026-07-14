import Link from "next/link";
import InfoBar from "@/components/dashboard/InfoBar";
import DashboardCalendar from "@/components/dashboard/DashboardCalendar";
import QrPlaceholder from "@/components/dashboard/QrPlaceholder";

export const metadata = {
  title: "Live Calendar | SMCS",
};

/*
  Phase 2 Live Calendar: a public, view-only, full-screen display for
  wall-mounted TVs that also reflows to phone width (future QR-code target).
  Lives outside the (site) route group so it renders without site chrome.

  Layout, top to bottom: scrolling info bar; a compact control row with a Home
  link (left) and the reserved QR slot (right); then the week calendar, which
  fills all remaining screen height.
*/
export default function DashboardPage() {
  return (
    <div className="flex h-screen flex-col bg-paper">
      <InfoBar />

      {/* Compact control row, kept short so the calendar starts high and uses
          the most vertical space possible. */}
      <div className="flex items-center justify-between gap-4 px-3 py-1.5 md:px-4">
        <Link
          href="/"
          className="inline-block border-2 border-blue px-4 py-1.5 text-base font-semibold text-blue hover:bg-blue hover:text-paper md:text-lg"
        >
          ← Home
        </Link>

        {/* Reserved top-right slot for a future QR code. */}
        <QrPlaceholder />
      </div>

      {/* min-h-0 lets the calendar shrink within the flex column so its
          height:100% fills all remaining space instead of overflowing. */}
      <div className="min-h-0 flex-1 px-2 pb-2 md:px-4">
        <DashboardCalendar />
      </div>
    </div>
  );
}
