import Link from "next/link";
import { Poppins } from "next/font/google";
import InfoBar from "@/components/dashboard/InfoBar";
import DashboardCalendar from "@/components/dashboard/DashboardCalendar";
import QrPlaceholder from "@/components/dashboard/QrPlaceholder";
import MobileHeader from "@/components/MobileHeader";
import { SHOW_QR_PLACEHOLDER } from "@/lib/dashboardConfig";

export const metadata = {
  title: "Live Calendar | SMCS",
};

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-body",
  display: "swap",
});

/*
  Phase 2 Live Calendar: a public, view-only, full-screen display for
  wall-mounted TVs that also reflows to phone width (future QR-code target).
  Lives outside the (site) route group so it renders without site chrome.

  Layout, top to bottom: scrolling info bar; a compact control row with a Home
  link (left) and the reserved QR slot (right, currently hidden via
  SHOW_QR_PLACEHOLDER); then the week calendar, which fills all remaining
  screen height.
*/
export default function DashboardPage() {
  return (
    <div className={`${poppins.variable} flex min-h-dvh flex-col lg:block`}>
      <MobileHeader />
      <div className="flex min-h-0 flex-1 flex-col bg-paper lg:h-screen">
        <InfoBar />

        {/* Desktop display controls; mobile navigation already provides Home. */}
        <div className="hidden items-center justify-between gap-4 px-4 py-1.5 lg:flex">
          <Link
            href="/"
            className="inline-block border-2 border-blue px-4 py-1.5 text-lg font-semibold text-blue hover:bg-blue hover:text-paper"
          >
            ← Home
          </Link>

          {/* Reserved top-right slot for a future QR code. Hidden until QR
              generation exists, so the wall display never shows an empty
              placeholder box (see SHOW_QR_PLACEHOLDER in dashboardConfig).
              justify-between keeps Home on the left with no second child. */}
          {SHOW_QR_PLACEHOLDER && <QrPlaceholder />}
        </div>

        {/* min-h-0 lets the calendar fill the remaining viewport height. */}
        <div className="min-h-0 flex-1 px-2 pb-2 lg:px-4">
          <DashboardCalendar />
        </div>
      </div>
    </div>
  );
}
