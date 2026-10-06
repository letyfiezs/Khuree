"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { recentlyWatchedKey, type RecentWatchItem } from "@/components/recently-watched";

export type VerticalReelItem = {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  age: string;
  duration: string;
  posterUrl?: string;
  videoUrl: string;
  subtitles: { id: string; label: string; language: string; sourceUrl?: string }[];
};

const LIVE_HEARTBEAT_INTERVAL_MS = 15_000;

export function VerticalReels({ items }: { items: VerticalReelItem[] }) {
  const feedRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLElement | null)[]>([]);
  const videosRef = useRef<(HTMLVideoElement | null)[]>([]);
  const recordedRef = useRef(new Set<string>());
  const liveSessionRef = useRef<string | undefined>(undefined);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [playingId, setPlayingId] = useState<string>();
  const [progress, setProgress] = useState(0);
  const [showPlay, setShowPlay] = useState(false);

  useEffect(() => {
    const root = feedRef.current;
    if (!root) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const index = Number((visible?.target as HTMLElement | undefined)?.dataset.index);
      if (Number.isInteger(index)) setActive(index);
    }, { root, threshold: [0.55, 0.75, 0.9] });
    cardsRef.current.forEach((card) => { if (card) observer.observe(card); });
    return () => observer.disconnect();
  }, [items.length]);

  useEffect(() => {
    videosRef.current.forEach((video, index) => {
      if (!video) return;
      video.muted = muted;
      if (index === active) void video.play().catch(() => setShowPlay(true));
      else video.pause();
    });
  }, [active, muted]);

  useEffect(() => {
    const item = items[active];
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
  }, [active, items, playingId]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") { event.preventDefault(); goTo(Math.min(items.length - 1, active + 1)); }
      if (event.key === "ArrowUp") { event.preventDefault(); goTo(Math.max(0, active - 1)); }
      if (event.key === " ") { event.preventDefault(); togglePlayback(active); }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [active, items.length]);

  function goTo(index: number) {
    cardsRef.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function togglePlayback(index: number) {
    const video = videosRef.current[index];
    if (!video) return;
    if (video.paused) void video.play(); else video.pause();
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
    if (card?.requestFullscreen) await card.requestFullscreen().catch(() => {});
  }

  if (!items.length) return (
    <main className="vertical-reels-page vertical-reels-empty">
      <Link href="/">← Нүүр</Link><div><b>Босоо драма алга байна</b><span>Admin хэсгээс “Босоо драма” ангилалтай видео нэмнэ үү.</span></div>
    </main>
  );

  return (
    <main className="vertical-reels-page">
      <div className="vertical-reel-feed" ref={feedRef}>
        {items.map((item, index) => (
          <article className="vertical-reel" data-index={index} key={item.id} ref={(node) => { cardsRef.current[index] = node; }}>
            <div className="vertical-reel-frame" onClick={() => togglePlayback(index)}>
              <video
                ref={(node) => { videosRef.current[index] = node; }}
                src={item.videoUrl}
                poster={item.posterUrl}
                playsInline
                muted={muted}
                preload={index < 2 ? "metadata" : "none"}
                onPlay={() => { setPlayingId(item.id); setShowPlay(false); recordView(item); }}
                onPause={() => { if (index === active) { setPlayingId(undefined); setShowPlay(true); } }}
                onTimeUpdate={(event) => { if (index === active) { const video = event.currentTarget; setProgress(video.duration ? video.currentTime / video.duration : 0); } }}
                onEnded={() => index < items.length - 1 ? goTo(index + 1) : void videosRef.current[index]?.play()}
              >
                {item.subtitles.map((subtitle) => subtitle.sourceUrl && <track default={subtitle === item.subtitles[0]} key={subtitle.id} kind="subtitles" label={subtitle.label} src={subtitle.sourceUrl} srcLang={subtitle.language} />)}
              </video>
              <div className="vertical-reel-shade" />
              <header className="vertical-reel-top" onClick={(event) => event.stopPropagation()}>
                <Link href="/">←</Link><b><i>Х</i>ҮРЭЭ</b><span>{index + 1} / {items.length}</span>
              </header>
              {showPlay && index === active && <button className="vertical-reel-center-play" type="button" aria-label="Тоглуулах" onClick={(event) => { event.stopPropagation(); togglePlayback(index); }}>▶</button>}
              <div className="vertical-reel-actions" onClick={(event) => event.stopPropagation()}>
                <button type="button" aria-label={muted ? "Дуу асаах" : "Дуу хаах"} onClick={() => setMuted((value) => !value)}><span>{muted ? "⌁" : "◖"}</span><small>{muted ? "Дуу" : "Асаалттай"}</small></button>
                <button type="button" aria-label="Дэлгэц дүүргэх" onClick={() => void enterFullscreen(index)}><span>⛶</span><small>Дэлгэц</small></button>
                <Link href={`/movie/${encodeURIComponent(item.slug)}`}><span>ⓘ</span><small>Тухай</small></Link>
              </div>
              <div className="vertical-reel-copy" onClick={(event) => event.stopPropagation()}>
                <p>БОСОО ДРАМА · {item.age} · {item.duration}</p>
                <h1>{item.title}</h1>
                <span>{item.synopsis}</span>
              </div>
              {index < items.length - 1 && <button className="vertical-reel-next" type="button" onClick={(event) => { event.stopPropagation(); goTo(index + 1); }}>Дараагийнх <i>⌄</i></button>}
              <div className="vertical-reel-progress"><i style={{ transform: `scaleX(${progress})` }} /></div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
