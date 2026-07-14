import { Playfair_Display } from "next/font/google";
import Header from "@/components/Header";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

// Editorial serif for big headings across the site (hero + section titles).
// Exposed as --font-display; used via the `.font-display` utility.
const serif = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});

/*
  Marketing/site layout: teal top bar (Header) + primary nav, page content in
  <main>, Footer at the bottom. Applies to every route in the (site) group.
*/
export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${serif.variable} flex min-h-screen flex-col`}>
      <Header />
      {/* Positioning context so the home page nav can overlay the hero image */}
      <div className="relative flex flex-1 flex-col">
        <NavBar />
        <main className="flex-1">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
