import { BUILD_VERSION } from "@/lib/buildVersion";

/*
  The deploy this server is running, for BuildVersionWatcher on the wall TVs
  and the screen health page. Rendered per request and never cached, or a TV
  could keep reading the old answer after a deploy. The value is a commit SHA,
  not a secret; nothing here is user-specific, so no auth.
*/
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { version: BUILD_VERSION },
    { headers: { "Cache-Control": "no-store" } },
  );
}
