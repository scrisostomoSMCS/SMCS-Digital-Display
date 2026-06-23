import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SMCS",
  description: "SMCS — official website",
};

/*
  Root layout: only the bare <html>/<body> + global styles.
  Site chrome (Header + NavBar + Footer) lives in the (site) route group so
  the full-screen /dashboard display can opt out of it. Routes that should
  show the chrome go under src/app/(site)/.
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
