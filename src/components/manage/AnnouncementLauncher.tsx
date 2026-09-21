"use client";

import { useEffect, useState } from "react";
import { OPEN_ANNOUNCEMENT_EVENT, openAnnouncementModal } from "@/lib/announcements";
import AnnouncementModal from "./AnnouncementModal";
import DepthButton from "./DepthButton";

/*
  The "Create an Announcement" button at the top of the manage page, and the one
  modal it opens.

  The sidebar's "Announcement" item opens the SAME modal. The two live in
  different subtrees of a Server Component page, so they talk through a window
  event (OPEN_ANNOUNCEMENT_EVENT) rather than shared state — a context provider
  would mean wrapping the whole manage page in a client component, which is a
  much larger change for one button.
*/
export default function AnnouncementLauncher() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_ANNOUNCEMENT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_ANNOUNCEMENT_EVENT, onOpen);
  }, []);

  return (
    <>
      <DepthButton type="button" onClick={openAnnouncementModal}>
        Create an Announcement
      </DepthButton>
      {open && <AnnouncementModal onClose={() => setOpen(false)} />}
    </>
  );
}
