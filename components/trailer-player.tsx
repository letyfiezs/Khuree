"use client";
import { useRef, useState } from "react";

function externalEmbedUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (host === "youtu.be" || host.endsWith(".youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : undefined;
    }
    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      const parts = url.pathname.split("/").filter(Boolean);
      const id = url.searchParams.get("v") ?? (["shorts", "embed", "live"].includes(parts[0] ?? "") ? parts[1] : undefined);
      return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : undefined;
    }
    if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.watch" || host.endsWith(".fb.watch")) {
      const id = url.searchParams.get("v") ?? url.pathname.match(/\/reel\/(\d+)/)?.[1] ?? url.pathname.match(/\/videos\/(?:.*\/)?(\d+)\/?$/)?.[1];
      const canonicalUrl = id ? `https://www.facebook.com/watch/?v=${id}` : url.toString();
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(canonicalUrl)}&show_text=false&autoplay=true&allowfullscreen=true`;
    }
  } catch { return undefined; }
  return undefined;
}

export function TrailerPlayer({ src, externalUrl, title, durationSeconds }: { src?: string; externalUrl?: string; title: string; durationSeconds: number }) {
  const [open, setOpen] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  function close() { video.current?.pause(); setOpen(false); }
  const embedUrl = externalEmbedUrl(externalUrl);
  if (!src && !embedUrl) return null;
  return <><button type="button" className="secondary-button trailer-button" onClick={() => setOpen(true)}>▷ &nbsp;Trailer үзэх{src && !embedUrl ? ` · ${Math.round(durationSeconds / 60)} мин` : ""}</button>{open && <div className="trailer-modal" role="dialog" aria-modal="true" aria-label={`${title} trailer`} onClick={close}><div onClick={(event) => event.stopPropagation()}><button type="button" className="trailer-close" onClick={close}>×</button>{embedUrl ? <iframe src={embedUrl} title={`${title} trailer`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : <video ref={video} src={src} controls playsInline autoPlay preload="metadata" onTimeUpdate={(event) => { if (event.currentTarget.currentTime >= durationSeconds) { event.currentTarget.pause(); event.currentTarget.currentTime = durationSeconds; } }} />}<h2>{title} — Trailer</h2><p>{embedUrl ? "Trailer-ийг сайтаас шууд үзэж байна" : `${Math.round(durationSeconds / 60)} минутын танилцуулга`}</p></div></div>}</>;
}
