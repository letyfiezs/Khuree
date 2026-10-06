"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { recentlyWatchedKey, type RecentWatchItem } from "@/components/recently-watched";

export type VerticalReelItem = {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  age: string;
  duration: string;
  segmentMinutes: 3 | 5;
  posterUrl?: string;
  videoUrl: string;
  subtitles: { id: string; label: string; language: string; sourceUrl?: string }[];
};

const LIVE_HEARTBEAT_INTERVAL_MS = 15_000;

export function VerticalReels({ items, initialPart = 1 }: { items: VerticalReelItem[]; initialPart?: number }) {
  const item = items[0];
  if (!item) return (
    <main className="vertical-reels-page vertical-reels-empty">
      <Link href="/">← Нүүр</Link><div><b>Босоо драма алга байна</b><span>Admin хэсгээс “Босоо драма” ангилалтай видео нэмнэ үү.</span></div>
    </main>
  );
  return <VerticalReelPlayer item={item} initialPart={initialPart} />;
}

function VerticalReelPlayer({ item, initialPart }: { item: VerticalReelItem; initialPart: number }) {
  const router = useRouter();
  const frameRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimerRef = useRef<number | undefined>(undefined);
  const liveSessionRef = useRef<string | undefined>(undefined);
  const recordedRef = useRef(false);
  const advancingRef = useRef(false);
  const touchStartYRef = useRef<number | undefined>(undefined);
  const lastGestureAtRef = useRef(0);
  const [part, setPart] = useState(Math.max(0, Math.floor(initialPart) - 1));
  const [partCount, setPartCount] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPlay, setShowPlay] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [videoError, setVideoError] = useState("");
  const [partsOpen, setPartsOpen] = useState(false);
  const segmentSeconds = item.segmentMinutes * 60;
  const startSeconds = part * segmentSeconds;
  const endSeconds = duration ? Math.min(duration, (part + 1) * segmentSeconds) : 0;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    advancingRef.current = true;
    setLoading(true);
    setShowPlay(false);
    setProgress(0);
    setVideoError("");
    if (video.readyState >= 1) video.currentTime = startSeconds;
    else video.load();
    void video.play().then(() => { advancingRef.current = false; }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      advancingRef.current = false;
      setLoading(false);
      setShowPlay(true);
    });
  }, [startSeconds]);

  useEffect(() => { if (videoRef.current) videoRef.current.muted = muted; }, [muted]);

  useEffect(() => {
    if (!playing) return;
    if (!liveSessionRef.current) {
      const saved = sessionStorage.getItem("khuree-vertical-live-session");
      liveSessionRef.current = saved && /^[0-9a-f-]{36}$/i.test(saved) ? saved : crypto.randomUUID();
      sessionStorage.setItem("khuree-vertical-live-session", liveSessionRef.current);
    }
    const body = JSON.stringify({ movieId: item.id, sessionId: liveSessionRef.current });
    const send = (method: "POST" | "DELETE") => void fetch("/api/analytics/live", {
      method, cache: "no-store", keepalive: true, headers: { "content-type": "application/json" }, body,
    });
    send("POST");
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") send("POST"); }, LIVE_HEARTBEAT_INTERVAL_MS);
    return () => { window.clearInterval(timer); send("DELETE"); };
  }, [item.id, playing]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!partCount) return;
        const next = event.key === "ArrowDown" ? part + 1 : part - 1;
        const target = Math.max(0, Math.min(partCount - 1, next));
        if (target !== part) setPart(target);
      }
      if (event.key === " ") {
        event.preventDefault();
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) void video.play();
        else video.pause();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [part, partCount]);

  useLayoutEffect(() => {
    const stopPlayback = () => videoRef.current?.pause();
    const stopWhenHidden = () => { if (document.visibilityState === "hidden") stopPlayback(); };
    window.addEventListener("pagehide", stopPlayback);
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      window.removeEventListener("pagehide", stopPlayback);
      document.removeEventListener("visibilitychange", stopWhenHidden);
      stopPlayback();
      if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    };
  }, []);

  function revealControls(autoHide = true) {
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    setControlsVisible(true);
    if (autoHide) controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 2500);
  }

  function recordView() {
    if (recordedRef.current) return;
    recordedRef.current = true;
    void fetch("/api/analytics/view", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ movieId: item.id }) });
    try {
      const saved = JSON.parse(localStorage.getItem(recentlyWatchedKey) ?? "[]") as RecentWatchItem[];
      const recent: RecentWatchItem = { id: item.id, slug: item.slug, title: item.title, posterUrl: item.posterUrl, age: item.age, kind: "movie", watchedAt: Date.now() };
      localStorage.setItem(recentlyWatchedKey, JSON.stringify([recent, ...saved.filter((entry) => entry.id !== item.id)].slice(0, 20)));
    } catch { /* Ignore invalid old local history. */ }
  }

  function selectPart(next: number) {
    if (!partCount) return;
    const target = Math.max(0, Math.min(partCount - 1, next));
    if (target === part) { setPartsOpen(false); return; }
    advancingRef.current = true;
    setPart(target);
    setPartsOpen(false);
    setControlsVisible(true);
  }

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      setLoading(true);
      void video.play().catch(() => { setLoading(false); setShowPlay(true); setVideoError("Видео тоглуулж чадсангүй. Дахин дарж үзнэ үү."); });
    } else video.pause();
  }

  function handleMetadata(video: HTMLVideoElement) {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    const nextDuration = video.duration;
    const nextCount = Math.max(1, Math.ceil(nextDuration / segmentSeconds));
    setDuration(nextDuration);
    setPartCount(nextCount);
    if (part >= nextCount) setPart(nextCount - 1);
    else if (Math.abs(video.currentTime - startSeconds) > 0.25) video.currentTime = startSeconds;
  }

  function handleTimeUpdate(video: HTMLVideoElement) {
    const end = endSeconds || video.duration;
    const length = end - startSeconds;
    setProgress(length > 0 ? Math.max(0, Math.min(1, (video.currentTime - startSeconds) / length)) : 0);
    if (!duration || video.currentTime < end - 0.12 || advancingRef.current) return;
    advancingRef.current = true;
    if (part < partCount - 1) setPart((current) => current + 1);
    else {
      video.currentTime = startSeconds;
      advancingRef.current = false;
      void video.play();
    }
  }

  function handleSwipe(endY: number) {
    const startY = touchStartYRef.current;
    touchStartYRef.current = undefined;
    if (startY === undefined || Math.abs(startY - endY) < 45) return;
    lastGestureAtRef.current = Date.now();
    selectPart(startY > endY ? part + 1 : part - 1);
  }

  function handleWheel(deltaY: number) {
    if (Math.abs(deltaY) < 25 || Date.now() - lastGestureAtRef.current < 450) return;
    lastGestureAtRef.current = Date.now();
    selectPart(deltaY > 0 ? part + 1 : part - 1);
  }

  async function enterFullscreen() {
    const frame = frameRef.current;
    if (frame?.requestFullscreen) {
      try { await frame.requestFullscreen(); return; }
      catch { /* Fall back to the native iPhone video player. */ }
    }
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    video?.webkitEnterFullscreen?.();
  }

  return (
    <main className="vertical-reels-page">
      <article className="vertical-reel vertical-reel-single" onTouchStart={(event) => { touchStartYRef.current = event.changedTouches[0]?.clientY; }} onTouchEnd={(event) => handleSwipe(event.changedTouches[0]?.clientY ?? 0)} onWheel={(event) => handleWheel(event.deltaY)}>
        <section ref={frameRef} className={`vertical-reel-frame ${controlsVisible ? "controls-visible" : "controls-hidden"}`} onClick={() => {
          if (Date.now() - lastGestureAtRef.current < 300) return;
          if (!controlsVisible) { revealControls(); return; }
          togglePlayback();
        }}>
          <video ref={videoRef} src={item.videoUrl} poster={item.posterUrl} autoPlay playsInline muted={muted} preload="auto" onLoadStart={() => setLoading(true)} onWaiting={() => setLoading(true)} onSeeking={() => setLoading(true)} onSeeked={() => { advancingRef.current = false; setLoading(false); }} onLoadedMetadata={(event) => handleMetadata(event.currentTarget)} onCanPlay={(event) => { handleMetadata(event.currentTarget); if (event.currentTarget.paused) void event.currentTarget.play().catch(() => { setLoading(false); setShowPlay(true); }); }} onPlaying={() => { advancingRef.current = false; setLoading(false); setPlaying(true); setShowPlay(false); setVideoError(""); revealControls(); recordView(); }} onPause={() => { setPlaying(false); if (!advancingRef.current) { setShowPlay(true); revealControls(false); } }} onError={() => { setLoading(false); setShowPlay(true); setVideoError("Видео ачаалж чадсангүй. Интернэтээ шалгаад дахин оролдоно уу."); revealControls(false); }} onTimeUpdate={(event) => handleTimeUpdate(event.currentTarget)} onEnded={(event) => handleTimeUpdate(event.currentTarget)}>
            {item.subtitles.map((subtitle) => subtitle.sourceUrl && <track default={subtitle === item.subtitles[0]} key={subtitle.id} kind="subtitles" label={subtitle.label} src={subtitle.sourceUrl} srcLang={subtitle.language} />)}
          </video>
          <div className="vertical-reel-shade" />
          <header className="vertical-reel-top" onClick={(event) => event.stopPropagation()}><button type="button" aria-label="Буцах" onClick={() => router.push("/vertical")}>←</button><Link href="/" aria-label="Нүүр хуудас"><i>Х</i>ҮРЭЭ</Link><span>{part + 1} / {partCount || "…"}</span></header>
          {loading && !videoError && <div className="vertical-reel-loading" role="status"><i /><span>Видео ачаалж байна…</span></div>}
          {showPlay && !loading && <button className="vertical-reel-center-play" type="button" aria-label="Тоглуулах" onClick={(event) => { event.stopPropagation(); togglePlayback(); }}>▶</button>}
          <div className="vertical-reel-actions" onClick={(event) => event.stopPropagation()}>
            <button type="button" aria-label={muted ? "Дуу асаах" : "Дуу хаах"} onClick={() => setMuted((value) => !value)}><span>{muted ? "⌁" : "◖"}</span><small>{muted ? "Дуу" : "Асаалттай"}</small></button>
            <button type="button" aria-label="Хэсгүүдийг харах" onClick={() => { setPartsOpen(true); revealControls(false); }}><span>▦</span><small>Ангиуд</small></button>
            <button type="button" aria-label="Бүтэн дэлгэцээр үзэх" onClick={() => void enterFullscreen()}><span>⛶</span><small>Бүтэн</small></button>
            <Link href={`/movie/${encodeURIComponent(item.slug)}`}><span>ⓘ</span><small>Тухай</small></Link>
          </div>
          <div className="vertical-reel-copy"><p>БОСОО ДРАМА · {part + 1}-Р ХЭСЭГ · {item.age}</p><h1>{item.title}</h1><span>{partCount || "…"} хэсэг · хэсэг бүр {item.segmentMinutes} минут</span></div>
          {part < partCount - 1 && <button className="vertical-reel-next" type="button" onClick={(event) => { event.stopPropagation(); selectPart(part + 1); }}>Дараагийнх <i>⌄</i></button>}
          {videoError && <button className="vertical-reel-error" type="button" onClick={(event) => { event.stopPropagation(); setVideoError(""); togglePlayback(); }}>{videoError}</button>}
          <div className="vertical-reel-progress"><i style={{ transform: `scaleX(${progress})` }} /></div>
          {partsOpen && <div className="vertical-reel-parts-backdrop" onClick={(event) => { event.stopPropagation(); setPartsOpen(false); }}><section className="vertical-reel-parts" onClick={(event) => event.stopPropagation()}><header><span><small>БҮХ ХЭСЭГ</small><b>{item.title}</b></span><button type="button" aria-label="Хаах" onClick={() => setPartsOpen(false)}>×</button></header><div>{Array.from({ length: partCount }, (_, index) => <button type="button" className={index === part ? "active" : ""} onClick={() => selectPart(index)} key={index}>{index + 1}</button>)}</div></section></div>}
        </section>
      </article>
    </main>
  );
}
