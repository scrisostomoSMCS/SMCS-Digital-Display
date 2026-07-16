import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "SMCS",
  description: "SMCS, official website",
};

/*
  Root layout: only the bare <html>/<body> + global styles.
  Site chrome (Header + NavBar + Footer) lives in the (site) route group so
  the full-screen /dashboard and /information displays can opt out of it.
  The Digital Bulletin signage loads its own fonts (Playfair Display + Poppins).

  NextIntlClientProvider makes the active locale + translations available to
  every client component; the locale comes from the SMCS_LOCALE cookie (see
  src/i18n/request.ts).
*/
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
