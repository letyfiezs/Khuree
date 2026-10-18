"use client";

import { useEffect, useRef } from "react";

export function RailScrollProgress() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const rail = track?.previousElementSibling;
    const thumb = track?.firstElementChild;
    if (!(rail instanceof HTMLElement) || !(thumb instanceof HTMLElement) || !track) return;

    const update = () => {
      const maxScroll = rail.scrollWidth - rail.clientWidth;
      track.hidden = maxScroll <= 1;
      if (maxScroll <= 1) return;
      const width = Math.max(12, (rail.clientWidth / rail.scrollWidth) * 100);
      thumb.style.width = `${width}%`;
      thumb.style.left = `${(rail.scrollLeft / maxScroll) * (100 - width)}%`;
    };

    const resizeObserver = new ResizeObserver(update);
    const mutationObserver = new MutationObserver(update);
    resizeObserver.observe(rail);
    mutationObserver.observe(rail, { childList: true });
    rail.addEventListener("scroll", update, { passive: true });
    update();

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      rail.removeEventListener("scroll", update);
    };
  }, []);

  return <div ref={trackRef} className="film-rail-progress" aria-hidden="true" hidden><span /></div>;
}
