import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Phase 1: no remote image hosts yet. When real images are hosted
  // (e.g. Supabase storage) add their domains to images.remotePatterns here.

  // Which deploy a page came from (see lib/buildVersion). Vercel sets the SHA
  // during its build; anywhere else this is "dev", which never auto-reloads.
  env: {
    NEXT_PUBLIC_BUILD_VERSION: process.env.VERCEL_GIT_COMMIT_SHA || "dev",
  },
};

// Wires next-intl's request config (locale + messages) into the app.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
