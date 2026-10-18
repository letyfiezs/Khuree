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
type SubtitleCue = { start: number; end: number; text: string };

function parseSubtitleTime(value: string) {
  const parts = value.trim().replace(",", ".").split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return Number.NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number.NaN;
}

function parseWebVtt(source: string): SubtitleCue[] {
  const lines = source.replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n");
  const cues: SubtitleCue[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].includes("-->")) continue;
    const [rawStart, rawEnd] = lines[index].split("-->");
    const start = parseSubtitleTime(rawStart);
    const end = parseSubtitleTime(rawEnd.trim().split(/\s+/)[0]);
    const body: string[] = [];
    for (index += 1; index < lines.length && lines[index].trim(); index += 1) body.push(lines[index]);
    const text = body.join("\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").trim();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start && text) cues.push({ start, end, text });
  }
  return cues.sort((a, b) => a.start - b.start);
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, "0")}`;
}

export function VerticalReels({ items }: { items: VerticalReelItem[] }) {
  const feedRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState(items[0]?.id);
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const id = visible?.target.getAttribute("data-reel-id");
      if (id) setActiveId(id);
    }, { root: feed, threshold: [0.55, 0.75, 0.95] });
    feed.querySelectorAll<HTMLElement>("[data-reel-id]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [items]);
  if (!items.length) return (
    <main className="vertical-reels-page vertical-reels-empty">
      <Link href="/">← Нүүр</Link><div><b>Босоо драма алга байна</b><span>Admin хэсгээс “Босоо драма” ангилалтай видео нэмнэ үү.</span></div>
    </main>
  );
  const activeIndex = Math.max(0, items.findIndex((item) => item.id === activeId));
  return <main className="vertical-reels-page"><div ref={feedRef} className="vertical-reel-feed">{items.map((item, index) => <VerticalReelPlayer item={item} active={index === activeIndex} prepare={Math.abs(index - activeIndex) <= 1} key={item.id} />)}</div></main>;
}

function VerticalReelPlayer({ item, active, prepare }: { item: VerticalReelItem; active: boolean; prepare: boolean }) {
  const router = useRouter();
  const frameRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const nativeFullscreenRef = useRef<"webkit" | "standard" | null>(null);
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
  const [duration, setDuration] = useState(0);
  const [showPlay, setShowPlay] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2>(1);
  const [activeSubtitleId, setActiveSubtitleId] = useState(item.subtitles[0]?.id ?? "off");
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [visibleSubtitle, setVisibleSubtitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [videoError, setVideoError] = useState("");
  const [speeding, setSpeeding] = useState(false);
  const [seekFeedback, setSeekFeedback] = useState<{ text: string; side: "left" | "right" }>();
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!active) {
      video.pause();
      return;
    }
    void video.play().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLoading(false);
      setShowPlay(true);
    });
  }, [active, prepare, item.videoUrl]);

  useEffect(() => { if (videoRef.current) videoRef.current.muted = muted; }, [muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const restoreInline = () => {
      nativeFullscreenRef.current = null;
      video.controls = false;
      Array.from(video.textTracks).forEach((track) => { track.mode = "disabled"; });
    };
    const syncFullscreen = () => {
      if (nativeFullscreenRef.current === "standard" && document.fullscreenElement !== video) restoreInline();
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    video.addEventListener("webkitendfullscreen", restoreInline);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      video.removeEventListener("webkitendfullscreen", restoreInline);
      restoreInline();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (!active || activeSubtitleId === "off") return () => controller.abort();
    const selected = item.subtitles.find((subtitle) => subtitle.id === activeSubtitleId);
    if (!selected) return () => controller.abort();
    void fetch(`/api/subtitles/${encodeURIComponent(selected.id)}`, { credentials: "same-origin", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Subtitle ${response.status}`);
        return response.text();
      })
      .then((source) => setSubtitleCues(parseWebVtt(source)))
      .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setSubtitleCues([]); });
    return () => controller.abort();
  }, [active, activeSubtitleId, item.subtitles]);

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
      if (!active || event.target instanceof HTMLInputElement) return;
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
  }, [active]);

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
    if (nativeFullscreenRef.current) return;
    setProgress(video.duration > 0 ? Math.max(0, Math.min(1, video.currentTime / video.duration)) : 0);
    setVisibleSubtitle(subtitleCues.find((cue) => video.currentTime >= cue.start && video.currentTime < cue.end)?.text ?? "");
  }

  function startLongPress(target: EventTarget | null) {
    if (!(target instanceof HTMLElement) || target.closest("button,a,input")) return false;
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
    if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
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
    }, 340);
  }

  function enterNativePlayer() {
    stopLongPress();
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitSupportsFullscreen?: boolean }) | null;
    if (!video) return;
    video.controls = true;
    Array.from(video.textTracks).forEach((track, index) => {
      track.mode = item.subtitles[index]?.id === activeSubtitleId ? "showing" : "disabled";
    });
    try {
      if (video.webkitEnterFullscreen && video.webkitSupportsFullscreen !== false) {
        nativeFullscreenRef.current = "webkit";
        video.webkitEnterFullscreen();
        return;
      }
      if (video.requestFullscreen) {
        nativeFullscreenRef.current = "standard";
        void video.requestFullscreen().catch(() => {
          nativeFullscreenRef.current = null;
          video.controls = false;
          Array.from(video.textTracks).forEach((track) => { track.mode = "disabled"; });
        });
        return;
      }
    } catch { /* The browser may reject fullscreen before video metadata is ready. */ }
    nativeFullscreenRef.current = null;
    video.controls = false;
    Array.from(video.textTracks).forEach((track) => { track.mode = "disabled"; });
  }

  function toggleSpeed() {
    const next = playbackSpeed === 1 ? 2 : 1;
    setPlaybackSpeed(next);
    if (videoRef.current) videoRef.current.playbackRate = next;
    revealControls();
  }

  function cycleSubtitle() {
    const current = item.subtitles.findIndex((subtitle) => subtitle.id === activeSubtitleId);
    setSubtitleCues([]);
    setVisibleSubtitle("");
    setActiveSubtitleId(current < 0 || current === item.subtitles.length - 1 ? "off" : item.subtitles[current + 1].id);
    revealControls();
  }

  function seekTo(fraction: number) {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    video.currentTime = Math.max(0, Math.min(video.duration, fraction * video.duration));
    setProgress(fraction);
    revealControls();
  }

  return (
      <article data-reel-id={item.id} className="vertical-reel" onPointerDown={(event) => {
        if (!event.isPrimary || !startLongPress(event.target)) return;
        pointerStartYRef.current = event.clientY;
      }} onPointerMove={(event) => {
        const startY = pointerStartYRef.current;
        if (startY !== undefined && Math.abs(startY - event.clientY) > 12) stopLongPress();
      }} onPointerUp={() => finishPointer()} onPointerCancel={() => { pointerStartYRef.current = undefined; longPressTriggeredRef.current = false; stopLongPress(); }}>
        <section ref={frameRef} className={`vertical-reel-frame ${controlsVisible ? "controls-visible" : "controls-hidden"}`} onClick={(event) => handleFrameTap(event.clientX)} onContextMenu={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()}>
          <video ref={videoRef} src={prepare ? item.videoUrl : undefined} poster={item.posterUrl} autoPlay={active} playsInline muted={muted} preload={active ? "auto" : prepare ? "metadata" : "none"} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onLoadStart={() => setLoading(true)} onWaiting={() => setLoading(true)} onSeeking={() => setLoading(true)} onSeeked={(event) => { setLoading(false); handleTimeUpdate(event.currentTarget); }} onCanPlay={(event) => { if (active && event.currentTarget.paused) void event.currentTarget.play().catch(() => { setLoading(false); setShowPlay(true); }); }} onPlaying={() => { setLoading(false); setPlaying(true); setShowPlay(false); setVideoError(""); revealControls(); recordView(); }} onPause={() => { setPlaying(false); setShowPlay(true); revealControls(false); }} onError={() => { setLoading(false); setShowPlay(true); setVideoError("Видео ачаалж чадсангүй. Интернэтээ шалгаад дахин оролдоно уу."); revealControls(false); }} onTimeUpdate={(event) => handleTimeUpdate(event.currentTarget)} onEnded={() => { setPlaying(false); setShowPlay(true); setProgress(1); revealControls(false); }}>
            {item.subtitles.map((subtitle) => <track key={subtitle.id} kind="subtitles" src={`/api/subtitles/${encodeURIComponent(subtitle.id)}`} srcLang={subtitle.language} label={subtitle.label} />)}
          </video>
          <div className="vertical-reel-shade" />
          <header className="vertical-reel-top" onClick={(event) => event.stopPropagation()}><button type="button" aria-label="Буцах" onClick={() => router.push("/vertical")}>←</button><Link href="/" aria-label="Нүүр хуудас"><i>Х</i>ҮРЭЭ</Link><span>БҮТЭН</span></header>
          {loading && !videoError && <div className="vertical-reel-loading" role="status"><i /><span>Видео ачаалж байна…</span></div>}
          {speeding && <div className="vertical-reel-speed" role="status">2×</div>}
          {seekFeedback && <div className={`vertical-reel-seek-feedback ${seekFeedback.side}`} role="status"><b>{seekFeedback.side === "right" ? "»" : "«"}</b><span>{seekFeedback.text}</span></div>}
          {showPlay && !loading && <button className="vertical-reel-center-play" type="button" aria-label="Тоглуулах" onClick={(event) => { event.stopPropagation(); togglePlayback(); }}>▶</button>}
          {visibleSubtitle && <div className="vertical-reel-subtitle" aria-live="off">{visibleSubtitle}</div>}
          <div className="vertical-reel-actions" onClick={(event) => event.stopPropagation()}>
            <button type="button" aria-label={muted ? "Дуу асаах" : "Дуу хаах"} onClick={() => setMuted((value) => !value)}><span>{muted ? "⌁" : "◖"}</span><small>{muted ? "Дуу" : "Асаалттай"}</small></button>
            <button type="button" aria-label="Утасны бүтэн дэлгэцийн тоглуулагч" onClick={enterNativePlayer}><span>⛶</span><small>Бүтэн</small></button>
            <Link href={`/movie/${encodeURIComponent(item.slug)}`}><span>ⓘ</span><small>Тухай</small></Link>
          </div>
          <div className="vertical-reel-copy"><p>БОСОО ДРАМА · {item.age}</p><h1>{item.title}</h1><span>Бүтэн видео</span></div>
          {videoError && <button className="vertical-reel-error" type="button" onClick={(event) => { event.stopPropagation(); setVideoError(""); togglePlayback(); }}>{videoError}</button>}
          <div className="vertical-reel-controls" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
            <div className="vertical-reel-seekbar"><span>{formatTime(progress * duration)}</span><input type="range" aria-label="Бичлэг гүйлгэх" min="0" max="1000" value={Math.round(progress * 1000)} onChange={(event) => seekTo(Number(event.target.value) / 1000)} disabled={!duration} style={{ "--seek-progress": `${progress * 100}%` } as React.CSSProperties} /><span>{formatTime(duration)}</span></div>
            <div className="vertical-reel-control-buttons"><button type="button" onClick={() => seekBy(-5, "left")} aria-label="5 секунд ухраах">−5</button><button type="button" onClick={togglePlayback} aria-label={playing ? "Түр зогсоох" : "Тоглуулах"}>{playing ? "Ⅱ" : "▶"}</button><button type="button" onClick={() => seekBy(5, "right")} aria-label="5 секунд гүйлгэх">+5</button><button type="button" onClick={toggleSpeed} aria-label="Тоглуулах хурд">{playbackSpeed}×</button><button type="button" onClick={cycleSubtitle} disabled={!item.subtitles.length} aria-label="Subtitle сонгох" title={item.subtitles.find((subtitle) => subtitle.id === activeSubtitleId)?.label ?? "Subtitle унтраалттай"}>CC{activeSubtitleId === "off" ? "" : "✓"}</button><button type="button" onClick={enterNativePlayer} aria-label="Утасны бүтэн дэлгэцийн тоглуулагч">⛶</button></div>
          </div>
        </section>
      </article>
  );
}
