"use client";

import { useEffect } from "react";
import {
  HEARTBEAT_INTERVAL,
  SCREEN_ID_PATTERN,
  probeContent,
  sendHeartbeat,
} from "@/lib/screens";

/*
  Invisible check-in for a wall TV running /information?screen=<id>, so staff
  can see on /manage/health which screens are alive.

  Renders nothing and shares no state with InformationDisplay, so it cannot
  change what the bulletin shows. All work happens in an effect and in promise
  callbacks, where a failure can't reach the route's error boundary either; the
  lib functions never throw, and the .catch below is a second guard.

  No screen param (the WordPress embed, a browser tab) or a malformed one means
  no check-ins at all. An id that isn't registered is ignored by the database,
  so a typo in a Yodeck URL can't create a phantom screen.
*/
export default function ScreenHeartbeat({ screenId }: { screenId?: string }) {
  useEffect(() => {
    if (!screenId || !SCREEN_ID_PATTERN.test(screenId)) return;

    const beat = () => {
      probeContent()
        .then((contentOk) => sendHeartbeat(screenId, contentOk))
        .catch(() => {
          /* silent by design */
        });
    };

    beat();
    const id = setInterval(beat, HEARTBEAT_INTERVAL);
    return () => clearInterval(id);
  }, [screenId]);

  return null;
}
