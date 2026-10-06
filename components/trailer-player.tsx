"use client";
import { useRef, useState } from "react";

export function TrailerPlayer({ src, title, durationSeconds }: { src: string; title: string; durationSeconds: number }) {
  const [open, setOpen] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  function close() { video.current?.pause(); setOpen(false); }
  return <><button type="button" className="secondary-button trailer-button" onClick={() => setOpen(true)}>▷ &nbsp;Trailer үзэх · {Math.round(durationSeconds / 60)} мин</button>{open && <div className="trailer-modal" role="dialog" aria-modal="true" aria-label={`${title} trailer`} onClick={close}><div onClick={(event) => event.stopPropagation()}><button type="button" className="trailer-close" onClick={close}>×</button><video ref={video} src={src} controls playsInline autoPlay preload="metadata" onTimeUpdate={(event) => { if (event.currentTarget.currentTime >= durationSeconds) { event.currentTarget.pause(); event.currentTarget.currentTime = durationSeconds; } }} /><h2>{title} — Trailer</h2><p>{Math.round(durationSeconds / 60)} минутын танилцуулга</p></div></div>}</>;
}
