import InfoBar from "@/components/dashboard/InfoBar";
import WeekCalendar from "@/components/dashboard/WeekCalendar";
import QrPlaceholder from "@/components/dashboard/QrPlaceholder";

export const metadata = {
  title: "Live Dashboard | SMCS",
};

/*
  Phase 2 Live Dashboard: a public, view-only, full-screen display for
  wall-mounted TVs that also reflows to phone width (future QR-code target).
  Lives outside the (site) route group so it renders without site chrome.

  Layout, top to bottom: scrolling info bar, the week calendar (fills the
  remaining height), and a reserved QR-code slot pinned bottom-right.
*/
export default function DashboardPage() {
  return (
    <div className="flex h-screen flex-col bg-paper">
      <InfoBar />

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 md:px-8 md:py-6">
        {/* min-h-0 lets the calendar shrink within the flex column so its
            internal scroll/height:100% works instead of overflowing the page. */}
        <div className="min-h-0 flex-1">
          <WeekCalendar />
        </div>

        {/* Reserved bottom-right slot for a future QR code. */}
        <div className="flex justify-end">
          <QrPlaceholder />
        </div>
      </div>
    </div>
  );
}
