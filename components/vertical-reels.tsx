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
  posterUrl?: string;
  videoUrl: string;
  subtitles: { id: string; label: string; language: string; sourceUrl?: string }[];
};

const LIVE_HEARTBEAT_INTERVAL_MS = 15_000;

export function VerticalReels({ items }: { items: VerticalReelItem[] }) {
  const item = items[0];
  if (!item) return (
    <main className="vertical-reels-page vertical-reels-empty">
      <Link href="/">← Нүүр</Link><div><b>Босоо драма алга байна</b><span>Admin хэсгээс “Босоо драма” ангилалтай видео нэмнэ үү.</span></div>
    </main>
  );
  return <VerticalReelPlayer item={item} />;
}

function VerticalReelPlayer({ item }: { item: VerticalReelItem }) {
  const router = useRouter();
  const frameRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimerRef = useRef<number | undefined>(undefined);
  const liveSessionRef = useRef<string | undefined>(undefined);
  const recordedRef = useRef(false);
  const pointerStartYRef = useRef<number | undefined>(undefined);
  const longPressTimerRef = useRef<number | undefined>(undefined);
  const longPressTriggeredRef = useRef(false);
  const tapTimerRef = useRef<number | undefined>(undefined);
  const lastTapRef = useRef<{ at: number; side: "left" | "right" } | undefined>(undefined);
  const seekFeedbackTimerRef = useRef<number | undefined>(undefined);
  const lastGestureAtRef = useRef(0);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPlay, setShowPlay] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [videoError, setVideoError] = useState("");
  const [speeding, setSpeeding] = useState(false);
  const [seekFeedback, setSeekFeedback] = useState<{ text: string; side: "left" | "right" }>();
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setLoading(true);
    setShowPlay(false);
    setProgress(0);
    setVideoError("");
    if (video.readyState === 0) video.load();
    void video.play().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLoading(false);
      setShowPlay(true);
    });
  }, [item.videoUrl]);

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
  }, []);

  useLayoutEffect(() => {
    const video = videoRef.current;
    const stopPlayback = () => video?.pause();
    const stopWhenHidden = () => { if (document.visibilityState === "hidden") stopPlayback(); };
    window.addEventListener("pagehide", stopPlayback);
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      window.removeEventListener("pagehide", stopPlayback);
      document.removeEventListener("visibilitychange", stopWhenHidden);
      stopPlayback();
      if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
      if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
      if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
      if (seekFeedbackTimerRef.current) window.clearTimeout(seekFeedbackTimerRef.current);
      if (video) video.playbackRate = 1;
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

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      setLoading(true);
      void video.play().catch(() => { setLoading(false); setShowPlay(true); setVideoError("Видео тоглуулж чадсангүй. Дахин дарж үзнэ үү."); });
    } else video.pause();
  }

  function handleTimeUpdate(video: HTMLVideoElement) {
    setProgress(video.duration > 0 ? Math.max(0, Math.min(1, video.currentTime / video.duration)) : 0);
  }

  function startLongPress(target: EventTarget | null) {
    if (!(target instanceof HTMLElement) || target.closest("button,a")) return false;
    longPressTriggeredRef.current = false;
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      const video = videoRef.current;
      if (!video) return;
      video.playbackRate = 2;
      longPressTriggeredRef.current = true;
      lastGestureAtRef.current = Date.now();
      setSpeeding(true);
    }, 420);
    return true;
  }

  function stopLongPress() {
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = undefined;
    if (videoRef.current) videoRef.current.playbackRate = 1;
    setSpeeding(false);
  }

  function finishPointer() {
    const wasLongPress = longPressTriggeredRef.current;
    pointerStartYRef.current = undefined;
    stopLongPress();
    if (wasLongPress) {
      longPressTriggeredRef.current = false;
      lastGestureAtRef.current = Date.now();
    }
  }

  function seekBy(seconds: number, side: "left" | "right") {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    setSeekFeedback({ text: seconds > 0 ? "+5 сек" : "−5 сек", side });
    if (seekFeedbackTimerRef.current) window.clearTimeout(seekFeedbackTimerRef.current);
    seekFeedbackTimerRef.current = window.setTimeout(() => setSeekFeedback(undefined), 650);
  }

  function handleFrameTap(clientX: number) {
    if (Date.now() - lastGestureAtRef.current < 300) return;
    const frame = frameRef.current;
    if (!frame) return;
    const bounds = frame.getBoundingClientRect();
    const side = clientX < bounds.left + bounds.width / 2 ? "left" : "right";
    const now = Date.now();
    const previous = lastTapRef.current;
    if (previous && previous.side === side && now - previous.at < 320) {
      if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
      tapTimerRef.current = undefined;
      lastTapRef.current = undefined;
      seekBy(side === "right" ? 5 : -5, side);
      return;
    }
    lastTapRef.current = { at: now, side };
    if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
    tapTimerRef.current = window.setTimeout(() => {
      lastTapRef.current = undefined;
      if (!controlsVisible) { revealControls(); return; }
      togglePlayback();
    }, 260);
  }

  async function enterFullscreen() {
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!video) return;
    stopLongPress();
    if (video.webkitEnterFullscreen) {
      try { video.webkitEnterFullscreen(); return; }
      catch { /* Use the standard fullscreen API below. */ }
    }
    if (video.requestFullscreen) {
      try { await video.requestFullscreen(); return; }
      catch { /* Use the player frame as the final fallback. */ }
    }
    try { await frameRef.current?.requestFullscreen(); }
    catch { /* This browser does not provide a fullscreen API. */ }
  }

  return (
    <main className="vertical-reels-page">
      <article className="vertical-reel vertical-reel-single" onPointerDown={(event) => {
        if (!event.isPrimary || !startLongPress(event.target)) return;
        pointerStartYRef.current = event.clientY;
        event.currentTarget.setPointerCapture(event.pointerId);
      }} onPointerMove={(event) => {
        const startY = pointerStartYRef.current;
        if (startY !== undefined && Math.abs(startY - event.clientY) > 12) stopLongPress();
      }} onPointerUp={() => finishPointer()} onPointerCancel={() => { pointerStartYRef.current = undefined; longPressTriggeredRef.current = false; stopLongPress(); }}>
        <section ref={frameRef} className={`vertical-reel-frame ${controlsVisible ? "controls-visible" : "controls-hidden"}`} onClick={(event) => handleFrameTap(event.clientX)} onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()}>
          <video ref={videoRef} src={item.videoUrl} poster={item.posterUrl} autoPlay playsInline muted={muted} preload="auto" onLoadStart={() => setLoading(true)} onWaiting={() => setLoading(true)} onSeeking={() => setLoading(true)} onSeeked={() => setLoading(false)} onCanPlay={(event) => { if (event.currentTarget.paused) void event.currentTarget.play().catch(() => { setLoading(false); setShowPlay(true); }); }} onPlaying={() => { setLoading(false); setPlaying(true); setShowPlay(false); setVideoError(""); revealControls(); recordView(); }} onPause={() => { setPlaying(false); setShowPlay(true); revealControls(false); }} onError={() => { setLoading(false); setShowPlay(true); setVideoError("Видео ачаалж чадсангүй. Интернэтээ шалгаад дахин оролдоно уу."); revealControls(false); }} onTimeUpdate={(event) => handleTimeUpdate(event.currentTarget)} onEnded={() => { setPlaying(false); setShowPlay(true); setProgress(1); revealControls(false); }}>
            {item.subtitles.map((subtitle) => subtitle.sourceUrl && <track default={subtitle === item.subtitles[0]} key={subtitle.id} kind="subtitles" label={subtitle.label} src={subtitle.sourceUrl} srcLang={subtitle.language} />)}
          </video>
          <div className="vertical-reel-shade" />
          <header className="vertical-reel-top" onClick={(event) => event.stopPropagation()}><button type="button" aria-label="Буцах" onClick={() => router.push("/vertical")}>←</button><Link href="/" aria-label="Нүүр хуудас"><i>Х</i>ҮРЭЭ</Link><span>БҮТЭН</span></header>
          {loading && !videoError && <div className="vertical-reel-loading" role="status"><i /><span>Видео ачаалж байна…</span></div>}
          {speeding && <div className="vertical-reel-speed" role="status">2×</div>}
          {seekFeedback && <div className={`vertical-reel-seek-feedback ${seekFeedback.side}`} role="status"><b>{seekFeedback.side === "right" ? "»" : "«"}</b><span>{seekFeedback.text}</span></div>}
          {showPlay && !loading && <button className="vertical-reel-center-play" type="button" aria-label="Тоглуулах" onClick={(event) => { event.stopPropagation(); togglePlayback(); }}>▶</button>}
          <div className="vertical-reel-actions" onClick={(event) => event.stopPropagation()}>
            <button type="button" aria-label={muted ? "Дуу асаах" : "Дуу хаах"} onClick={() => setMuted((value) => !value)}><span>{muted ? "⌁" : "◖"}</span><small>{muted ? "Дуу" : "Асаалттай"}</small></button>
            <button type="button" aria-label="Бүтэн дэлгэцээр үзэх" onClick={() => void enterFullscreen()}><span>⛶</span><small>Бүтэн</small></button>
            <Link href={`/movie/${encodeURIComponent(item.slug)}`}><span>ⓘ</span><small>Тухай</small></Link>
          </div>
          <div className="vertical-reel-copy"><p>БОСОО ДРАМА · {item.age}</p><h1>{item.title}</h1><span>Бүтэн видео</span></div>
          {videoError && <button className="vertical-reel-error" type="button" onClick={(event) => { event.stopPropagation(); setVideoError(""); togglePlayback(); }}>{videoError}</button>}
          <div className="vertical-reel-progress"><i style={{ transform: `scaleX(${progress})` }} /></div>
        </section>
      </article>
    </main>
  );
}
