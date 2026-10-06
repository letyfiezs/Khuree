"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

type PlayableReel = VerticalReelItem & {
  reelKey: string;
  part: number;
  partCount: number;
  startSeconds: number;
  endSeconds?: number;
};

const LIVE_HEARTBEAT_INTERVAL_MS = 15_000;

export function VerticalReels({ items }: { items: VerticalReelItem[] }) {
  const router = useRouter();
  const feedRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLElement | null)[]>([]);
  const videosRef = useRef<(HTMLVideoElement | null)[]>([]);
  const recordedRef = useRef(new Set<string>());
  const liveSessionRef = useRef<string | undefined>(undefined);
  const controlsTimerRef = useRef<number | undefined>(undefined);
  const scrollFrameRef = useRef<number | undefined>(undefined);
  const lastScrollAtRef = useRef(0);
  const activeRef = useRef(0);
  const advancingRef = useRef(false);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [playingId, setPlayingId] = useState<string>();
  const [progress, setProgress] = useState(0);
  const [showPlay, setShowPlay] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [videoError, setVideoError] = useState("");
  const [loading, setLoading] = useState(true);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const reels = useMemo(() => items.flatMap((item): PlayableReel[] => {
    const duration = durations[item.id];
    const segmentSeconds = item.segmentMinutes * 60;
    const partCount = duration ? Math.max(1, Math.ceil(duration / segmentSeconds)) : 1;
    return Array.from({ length: partCount }, (_, part) => ({
      ...item,
      reelKey: `${item.id}:${part}`,
      part,
      partCount,
      startSeconds: part * segmentSeconds,
      endSeconds: duration ? Math.min(duration, (part + 1) * segmentSeconds) : undefined,
    }));
  }), [durations, items]);

  useEffect(() => {
    videosRef.current.forEach((video, index) => {
      if (!video) return;
      video.muted = muted;
      if (index === active) {
        const reel = reels[index];
        if (reel && video.readyState >= 1 && (video.currentTime < reel.startSeconds - 0.25 || (reel.endSeconds && video.currentTime >= reel.endSeconds - 0.1))) {
          video.currentTime = reel.startSeconds;
        }
        if (video.readyState === 0) video.load();
        void video.play().catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setShowPlay(true);
          setLoading(false);
        });
      }
      else video.pause();
    });
  }, [active, muted, reels]);

  useEffect(() => {
    const item = reels[active];
    if (!item || playingId !== item.id) return;
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
  }, [active, playingId, reels]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") { event.preventDefault(); goTo(Math.min(reels.length - 1, active + 1)); }
      if (event.key === "ArrowUp") { event.preventDefault(); goTo(Math.max(0, active - 1)); }
      if (event.key === " ") { event.preventDefault(); togglePlayback(active); }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [active, reels.length]);

  useLayoutEffect(() => {
    const stopPlayback = () => videosRef.current.forEach((video) => video?.pause());
    const stopWhenHidden = () => { if (document.visibilityState === "hidden") stopPlayback(); };
    window.addEventListener("pagehide", stopPlayback);
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      window.removeEventListener("pagehide", stopPlayback);
      document.removeEventListener("visibilitychange", stopWhenHidden);
      stopPlayback();
      if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
      if (scrollFrameRef.current) window.cancelAnimationFrame(scrollFrameRef.current);
    };
  }, []);

  function handleScroll() {
    const root = feedRef.current;
    if (!root) return;
    lastScrollAtRef.current = Date.now();
    if (scrollFrameRef.current) window.cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      const pageHeight = root.clientHeight;
      if (!pageHeight) return;
      const next = Math.max(0, Math.min(reels.length - 1, Math.round(root.scrollTop / pageHeight)));
      if (next === activeRef.current) return;
      activeRef.current = next;
      advancingRef.current = false;
      setActive(next);
      setLoading(true);
      setPlayingId(undefined);
      setShowPlay(false);
      setProgress(0);
      setControlsVisible(true);
      setVideoError("");
    });
  }

  function goTo(index: number) {
    cardsRef.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function togglePlayback(index: number) {
    const video = videosRef.current[index];
    if (!video) return;
    if (video.paused) {
      if (video.readyState === 0) video.load();
      void video.play().catch(() => { setShowPlay(true); setVideoError("Видео тоглуулж чадсангүй. Дахин дарж үзнэ үү."); });
    } else video.pause();
  }

  function registerDuration(item: PlayableReel, video: HTMLVideoElement) {
    if (Number.isFinite(video.duration) && video.duration > 0) {
      const rounded = Math.round(video.duration * 10) / 10;
      setDurations((current) => current[item.id] === rounded ? current : { ...current, [item.id]: rounded });
    }
    if (video.currentTime < item.startSeconds - 0.25 || (item.endSeconds && video.currentTime >= item.endSeconds - 0.1)) {
      video.currentTime = item.startSeconds;
    }
  }

  function advanceFrom(index: number, video: HTMLVideoElement) {
    if (advancingRef.current) return;
    advancingRef.current = true;
    video.pause();
    setProgress(1);
    if (index < reels.length - 1) goTo(index + 1);
    else {
      const start = reels[index]?.startSeconds ?? 0;
      video.currentTime = start;
      advancingRef.current = false;
      void video.play();
    }
  }

  function revealControls(autoHide = true) {
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    setControlsVisible(true);
    if (autoHide) controlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 2500);
  }

  function handleFrameTap(index: number) {
    if (Date.now() - lastScrollAtRef.current < 300) return;
    if (!controlsVisible) { revealControls(); return; }
    togglePlayback(index);
  }

  function recordView(item: VerticalReelItem) {
    if (recordedRef.current.has(item.id)) return;
    recordedRef.current.add(item.id);
    void fetch("/api/analytics/view", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ movieId: item.id }) });
    try {
      const saved = JSON.parse(localStorage.getItem(recentlyWatchedKey) ?? "[]") as RecentWatchItem[];
      const recent: RecentWatchItem = { id: item.id, slug: item.slug, title: item.title, posterUrl: item.posterUrl, age: item.age, kind: "movie", watchedAt: Date.now() };
      localStorage.setItem(recentlyWatchedKey, JSON.stringify([recent, ...saved.filter((entry) => entry.id !== item.id)].slice(0, 20)));
    } catch { /* Ignore invalid old local history. */ }
  }

  async function enterFullscreen(index: number) {
    const card = cardsRef.current[index];
    if (card?.requestFullscreen) {
      try {
        await card.requestFullscreen();
        return;
      } catch { /* Fall back to the native iPhone video player. */ }
    }
    const video = videosRef.current[index] as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    video?.webkitEnterFullscreen?.();
  }

  if (!items.length) return (
    <main className="vertical-reels-page vertical-reels-empty">
      <Link href="/">← Нүүр</Link><div><b>Босоо драма алга байна</b><span>Admin хэсгээс “Босоо драма” ангилалтай видео нэмнэ үү.</span></div>
    </main>
  );

  return (
    <main className="vertical-reels-page">
      <div className="vertical-reel-feed" ref={feedRef} onScroll={handleScroll}>
        {reels.map((item, index) => {
          const shouldLoad = Math.abs(index - active) <= 1;
          return (
          <article className="vertical-reel" data-index={index} key={item.reelKey} ref={(node) => { cardsRef.current[index] = node; }}>
            <div className={`vertical-reel-frame ${controlsVisible && index === active ? "controls-visible" : "controls-hidden"}`} onClick={() => handleFrameTap(index)}>
              <video
                ref={(node) => { videosRef.current[index] = node; }}
                src={shouldLoad ? item.videoUrl : undefined}
                poster={item.posterUrl}
                autoPlay={index === active}
                playsInline
                muted={muted}
                preload={index === active ? "auto" : "metadata"}
                onLoadStart={() => { if (index === active) setLoading(true); }}
                onWaiting={() => { if (index === active) setLoading(true); }}
                onSeeking={() => { if (index === active) setLoading(true); }}
                onLoadedMetadata={(event) => registerDuration(item, event.currentTarget)}
                onCanPlay={(event) => {
                  if (index !== active || !event.currentTarget.paused) return;
                  registerDuration(item, event.currentTarget);
                  void event.currentTarget.play().catch(() => { setShowPlay(true); setLoading(false); });
                }}
                onPlaying={() => { advancingRef.current = false; setLoading(false); setPlayingId(item.id); setShowPlay(false); setVideoError(""); revealControls(); recordView(item); }}
                onPause={() => { if (index === active && !advancingRef.current) { setPlayingId(undefined); setShowPlay(true); revealControls(false); } }}
                onError={() => { if (index === active) { setLoading(false); setShowPlay(true); setVideoError("Видео ачаалж чадсангүй. Интернэтээ шалгаад дахин оролдоно уу."); revealControls(false); } }}
                onTimeUpdate={(event) => {
                  if (index !== active) return;
                  const video = event.currentTarget;
                  const end = item.endSeconds ?? video.duration;
                  const length = end - item.startSeconds;
                  setProgress(length > 0 ? Math.max(0, Math.min(1, (video.currentTime - item.startSeconds) / length)) : 0);
                  if (item.endSeconds && video.currentTime >= item.endSeconds - 0.12) advanceFrom(index, video);
                }}
                onEnded={(event) => advanceFrom(index, event.currentTarget)}
              >
                {item.subtitles.map((subtitle) => subtitle.sourceUrl && <track default={subtitle === item.subtitles[0]} key={subtitle.id} kind="subtitles" label={subtitle.label} src={subtitle.sourceUrl} srcLang={subtitle.language} />)}
              </video>
              <div className="vertical-reel-shade" />
              <header className="vertical-reel-top" onClick={(event) => event.stopPropagation()}>
                <button type="button" aria-label="Буцах" onClick={() => router.push("/vertical")}>←</button><Link href="/" aria-label="Нүүр хуудас"><i>Х</i>ҮРЭЭ</Link><span>{item.part + 1} / {item.partCount}</span>
              </header>
              {loading && index === active && !videoError && <div className="vertical-reel-loading" role="status"><i /><span>Видео ачаалж байна…</span></div>}
              {showPlay && !loading && index === active && <button className="vertical-reel-center-play" type="button" aria-label="Тоглуулах" onClick={(event) => { event.stopPropagation(); togglePlayback(index); }}>▶</button>}
              <div className="vertical-reel-actions" onClick={(event) => event.stopPropagation()}>
                <button type="button" aria-label={muted ? "Дуу асаах" : "Дуу хаах"} onClick={() => setMuted((value) => !value)}><span>{muted ? "⌁" : "◖"}</span><small>{muted ? "Дуу" : "Асаалттай"}</small></button>
                <button type="button" aria-label="Бүтэн дэлгэцээр үзэх" onClick={() => void enterFullscreen(index)}><span>⛶</span><small>Бүтэн</small></button>
                <Link href={`/movie/${encodeURIComponent(item.slug)}`}><span>ⓘ</span><small>Тухай</small></Link>
              </div>
              <div className="vertical-reel-copy">
                <p>БОСОО ДРАМА · {item.part + 1}-Р ХЭСЭГ · {item.age}</p>
                <h1>{item.title}</h1>
                <span>{item.partCount} хэсэг · хэсэг бүр {item.segmentMinutes} минут</span>
              </div>
              {index < reels.length - 1 && <button className="vertical-reel-next" type="button" onClick={(event) => { event.stopPropagation(); goTo(index + 1); }}>Дараагийнх <i>⌄</i></button>}
              {videoError && index === active && <button className="vertical-reel-error" type="button" onClick={(event) => { event.stopPropagation(); setVideoError(""); togglePlayback(index); }}>{videoError}</button>}
              <div className="vertical-reel-progress"><i style={{ transform: `scaleX(${progress})` }} /></div>
            </div>
          </article>
          );
        })}
      </div>
    </main>
  );
}
