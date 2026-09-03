"use client";

import { useEffect } from "react";

export function ClientProtection() {
  useEffect(() => {
    const blockContextMenu = (event: MouseEvent) => event.preventDefault();
    const blockShortcuts = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.key === "F12" || (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key)) || (event.ctrlKey && key === "u")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const blockMediaDrag = (event: DragEvent) => {
      if ((event.target as HTMLElement | null)?.closest("video,img")) event.preventDefault();
    };
    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockShortcuts, true);
    document.addEventListener("dragstart", blockMediaDrag);
    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockShortcuts, true);
      document.removeEventListener("dragstart", blockMediaDrag);
    };
  }, []);
  return null;
}
