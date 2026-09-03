"use client";

import { useEffect, useState } from "react";

export function ResilientPoster({ src, alt, blurred = false }: { src: string; alt: string; blurred?: boolean }) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const retry = () => {
    if (attempt < 1) { setAttempt(1); setLoaded(false); return; }
    setFailed(true);
  };
  useEffect(() => {
    if (loaded || failed) return;
    const timer = window.setTimeout(retry, 9000);
    return () => window.clearTimeout(timer);
  // retry is intentionally tied to image state only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, loaded, failed]);
  const url = attempt ? `${src}${src.includes("?") ? "&" : "?"}khuree_retry=1` : src;
  return <>
    {!loaded && !failed && <span className="poster-skeleton" aria-hidden="true" />}
    {/* Native img is deliberate: remote poster hosts are dynamic and retries must stay client-side. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {!failed && <img className={`poster-media ${loaded ? "loaded" : "loading"} ${blurred ? "blurred" : ""}`} src={url} alt={alt} loading="lazy" decoding="async" onLoad={() => setLoaded(true)} onError={retry} />}
    {failed && <span className="poster-image-failed" aria-hidden="true">ХҮРЭЭ</span>}
  </>;
}
