import { Playfair_Display, Poppins } from "next/font/google";
import InformationDisplay from "@/components/information/InformationDisplay";

export const metadata = {
  title: "Digital Bulletin | SMCS",
};

// Titles: Playfair Display SemiBold (600). Body/labels/service text: Poppins
// Medium/SemiBold (500/600). Scoped to this display via CSS variables so the
// rest of the site keeps its own typography.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-display",
  display: "swap",
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-body",
  display: "swap",
});

/*
  Full-screen, auto-rotating informational display for wall-mounted campus
  screens. Lives outside the (site) route group so it renders without site
  chrome (like the Live Calendar). Runs unattended; has its own Back to home.
*/
export default function InformationPage() {
  return (
    <div className={`${playfair.variable} ${poppins.variable}`}>
      <InformationDisplay />
    </div>
  );
}
