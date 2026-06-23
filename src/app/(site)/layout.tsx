import Header from "@/components/Header";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";

/*
  Marketing/site layout: Header + NavBar on top, Footer at the bottom,
  page content in <main>. Applies to every route in the (site) group.
  The /dashboard route intentionally lives outside this group so the
  wall-mounted TV display can render full-screen without site chrome.
*/
export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <NavBar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
