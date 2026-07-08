import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SMCS",
  description: "SMCS — official website",
};

/*
  Root layout: only the bare <html>/<body> + global styles.
  Site chrome (Header + NavBar + Footer) lives in the (site) route group so
  the full-screen /dashboard and /information displays can opt out of it.
  The Information signage loads its own fonts (Playfair Display + Poppins).
*/
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
