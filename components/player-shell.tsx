"use client";
import { useEffect, useRef, useState } from "react";
import type { SubtitleTrack } from "@/lib/storage/types";
import { recentlyWatchedKey, type RecentWatchItem } from "@/components/recently-watched";
type Props = {
  movieId?: string;
  manifestUrl?: string;
  title: string;
  subtitles?: SubtitleTrack[];
  autoPlay?: boolean;
  live?: boolean;
  recentItem?: Omit<RecentWatchItem, "watchedAt">;
};
type QualityTrack = {
  id: number;
  height: number;
  bandwidth: number;
  active: boolean;
};
type ShakaInstance = {
  destroy: () => Promise<void>;
  attach: (video: HTMLVideoElement) => Promise<void>;
  configure: (config: object) => void;
  load: (url: string) => Promise<void>;
  getVariantTracks: () => QualityTrack[];
  selectVariantTrack: (track: QualityTrack, clearBuffer?: boolean) => void;
  addEventListener: (type: string, listener: (event: Event) => void) => void;
};
const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "00:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};
export function PlayerShell({
  movieId,
  manifestUrl,
  title,
  subtitles = [],
  autoPlay = false,
  live = false,
  recentItem,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<ShakaInstance | undefined>(undefined);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const viewRecordedRef = useRef(false);
  const preferencesLoadedRef = useRef(false);
  const seekFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const gestureHoldTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const gestureSingleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const gestureRef = useRef({ pointerId: -1, held: false, previousRate: 1, lastTapAt: 0, lastSide: "" });
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekStart, setSeekStart] = useState(0);
  const [seekEnd, setSeekEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [qualities, setQualities] = useState<QualityTrack[]>([]);
  const [quality, setQuality] = useState("auto");
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [activeSubtitle, setActiveSubtitle] = useState(
    () => subtitles[0]?.id ?? "off",
  );
  const [subtitleSize, setSubtitleSize] = useState(100);
  const [subtitleColor, setSubtitleColor] = useState("#ffffff");
  const [subtitlePosition, setSubtitlePosition] = useState("82");
  const [state, setState] = useState("Тоглуулахад бэлэн");
  const [inlineFullscreen, setInlineFullscreen] = useState(false);
  const [playerOrientation, setPlayerOrientation] = useState<"portrait" | "landscape">("landscape");
  const [seekFeedback, setSeekFeedback] = useState<-10 | 10 | null>(null);
  const [speedHolding, setSpeedHolding] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("khuree-player-preferences") ?? "{}") as { subtitleEnabled?: boolean; subtitleSize?: number; subtitleColor?: string; subtitlePosition?: string };
      if (typeof saved.subtitleSize === "number") setSubtitleSize(Math.min(180, Math.max(60, saved.subtitleSize)));
      if (typeof saved.subtitleColor === "string") setSubtitleColor(saved.subtitleColor);
      if (typeof saved.subtitlePosition === "string") setSubtitlePosition(saved.subtitlePosition);
      if (saved.subtitleEnabled === false) setActiveSubtitle("off");
      else if (subtitles[0]) setActiveSubtitle(subtitles[0].id);
    } catch { /* Ignore an invalid old preference. */ }
    preferencesLoadedRef.current = true;
  }, [subtitles]);
  useEffect(() => {
    if (!preferencesLoadedRef.current) return;
    localStorage.setItem("khuree-player-preferences", JSON.stringify({
      subtitleEnabled: activeSubtitle !== "off",
      subtitleSize,
      subtitleColor,
      subtitlePosition,
    }));
  }, [activeSubtitle, subtitleSize, subtitleColor, subtitlePosition]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.setAttribute("x-webkit-airplay", "allow");
  }, []);
  useEffect(() => {
    if (!inlineFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [inlineFullscreen]);
  useEffect(() => () => {
    if (seekFeedbackTimerRef.current) clearTimeout(seekFeedbackTimerRef.current);
    if (gestureHoldTimerRef.current) clearTimeout(gestureHoldTimerRef.current);
    if (gestureSingleTimerRef.current) clearTimeout(gestureSingleTimerRef.current);
  }, []);
  useEffect(() => {
    let player: ShakaInstance | undefined;
    let cancelled = false;
    async function boot() {
      if (!manifestUrl || !videoRef.current) return;
      const loadNative = () => {
        const video = videoRef.current;
        if (!video) return;
        setError("");
        video.src = manifestUrl;
        video.load();
        if (autoPlay) {
          video.muted = true;
          setMuted(true);
          void video.play().catch(() => {});
        }
        setState("Тоглуулахад бэлэн");
      };
      // Uploaded MP4 and MPEG-TS files are most reliable through the browser's native
      // decoder, especially on iOS Safari over a LAN IP address.
      if (/\.(?:mp4|ts)(?:$|\?)/i.test(manifestUrl)) {
        loadNative();
        return;
      }
      try {
        const shaka = await import("shaka-player");
        shaka.default.polyfill.installAll();
        if (!shaka.default.Player.isBrowserSupported()) {
          loadNative();
          return;
        }
        const instance = new shaka.default.Player() as unknown as ShakaInstance;
        player = instance;
        playerRef.current = instance;
        await instance.attach(videoRef.current);
        const drmServers: Record<string, string> = {};
        if (process.env.NEXT_PUBLIC_WIDEVINE_LICENSE_URL)
          drmServers["com.widevine.alpha"] =
            process.env.NEXT_PUBLIC_WIDEVINE_LICENSE_URL;
        if (process.env.NEXT_PUBLIC_PLAYREADY_LICENSE_URL)
          drmServers["com.microsoft.playready"] =
            process.env.NEXT_PUBLIC_PLAYREADY_LICENSE_URL;
        if (process.env.NEXT_PUBLIC_FAIRPLAY_LICENSE_URL)
          drmServers["com.apple.fps"] =
            process.env.NEXT_PUBLIC_FAIRPLAY_LICENSE_URL;
        instance.configure({
          drm: {
            servers: drmServers,
            minHdcpVersion:
              process.env.NEXT_PUBLIC_DRM_MIN_HDCP_VERSION ?? "1.4",
            delayLicenseRequestUntilPlayed: true,
            advanced: process.env.NEXT_PUBLIC_WIDEVINE_LICENSE_URL
              ? {
                  "com.widevine.alpha": {
                    videoRobustness: "SW_SECURE_DECODE",
                    audioRobustness: "SW_SECURE_CRYPTO",
                    persistentStateRequired: false,
                    distinctiveIdentifierRequired: false,
                  },
                }
              : {},
            retryParameters: {
              maxAttempts: 3,
              baseDelay: 1000,
              backoffFactor: 2,
              fuzzFactor: 0.5,
              timeout: 15000,
            },
          },
          abr: { enabled: true, defaultBandwidthEstimate: 5_000_000 },
          streaming: {
            bufferingGoal: 30,
            rebufferingGoal: 2,
            retryParameters: {
              maxAttempts: 4,
              baseDelay: 500,
              backoffFactor: 2,
              fuzzFactor: 0.5,
              timeout: 15000,
            },
          },
        });
        instance.addEventListener("buffering", (event: Event) =>
          setBuffering(
            Boolean(
              (event as CustomEvent<{ buffering: boolean }>).detail?.buffering,
            ),
          ),
        );
        instance.addEventListener("error", () =>
          setError("Видео тоглуулахад сүлжээний алдаа гарлаа."),
        );
        await instance.load(manifestUrl);
        if (autoPlay && videoRef.current) {
          videoRef.current.muted = true;
          setMuted(true);
          await videoRef.current.play().catch(() => {});
        }
        if (!cancelled) {
          setState("Тоглуулахад бэлэн");
          setQualities(
            instance
              .getVariantTracks()
              .filter(
                (track, index, all) =>
                  track.height &&
                  all.findIndex((item) => item.height === track.height) ===
                    index,
              )
              .sort((a, b) => b.height - a.height),
          );
        }
      } catch {
        if (!cancelled) loadNative();
      }
    }
    void boot();
    return () => {
      cancelled = true;
      playerRef.current = undefined;
      void player?.destroy();
    };
  }, [manifestUrl, autoPlay]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const selected = subtitles.find((track) => track.id === activeSubtitle);
    Array.from(video.textTracks).forEach((track) => {
      track.mode =
        selected && track.label === selected.label ? "showing" : "disabled";
      if (track.cues)
        Array.from(track.cues).forEach((cue) => {
          const positionedCue = cue as VTTCue;
          positionedCue.snapToLines = false;
          positionedCue.line = Number(subtitlePosition);
        });
    });
  }, [activeSubtitle, subtitles, subtitlePosition]);
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? void video.play() : video.pause();
  };
  const seekBy = (seconds: -10 | 10) => {
    const video = videoRef.current;
    if (!video) return;
    const upper = Number.isFinite(video.duration) ? video.duration : video.currentTime + Math.abs(seconds);
    video.currentTime = Math.max(0, Math.min(upper, video.currentTime + seconds));
    setSeekFeedback(seconds);
    if (seekFeedbackTimerRef.current) clearTimeout(seekFeedbackTimerRef.current);
    seekFeedbackTimerRef.current = setTimeout(() => setSeekFeedback(null), 520);
    showControls();
  };
  const gesturePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || !videoRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current.pointerId = event.pointerId;
    gestureRef.current.held = false;
    if (gestureHoldTimerRef.current) clearTimeout(gestureHoldTimerRef.current);
    gestureHoldTimerRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (!video || gestureRef.current.pointerId !== event.pointerId) return;
      gestureRef.current.held = true;
      gestureRef.current.previousRate = video.playbackRate;
      video.playbackRate = 2;
      setSpeedHolding(true);
    }, 520);
  };
  const finishGesture = (event: React.PointerEvent<HTMLDivElement>, cancelled = false) => {
    if (event.pointerType !== "touch" || gestureRef.current.pointerId !== event.pointerId) return;
    if (gestureHoldTimerRef.current) clearTimeout(gestureHoldTimerRef.current);
    gestureRef.current.pointerId = -1;
    if (gestureRef.current.held) {
      if (videoRef.current) videoRef.current.playbackRate = gestureRef.current.previousRate;
      gestureRef.current.held = false;
      setSpeedHolding(false);
      return;
    }
    if (cancelled) return;
    // When custom landscape is rotated 90° inside a physically portrait iPhone,
    // the player's visual left/right axis maps to the screen's top/bottom axis.
    const physicallyLandscape = window.matchMedia("(orientation: landscape)").matches;
    const rotatedLandscape = inlineFullscreen && playerOrientation === "landscape" && !physicallyLandscape;
    const side = rotatedLandscape
      ? event.clientY < window.innerHeight / 2 ? "left" : "right"
      : event.clientX < window.innerWidth / 2 ? "left" : "right";
    const now = Date.now();
    if (now - gestureRef.current.lastTapAt < 320 && gestureRef.current.lastSide === side) {
      if (gestureSingleTimerRef.current) clearTimeout(gestureSingleTimerRef.current);
      gestureRef.current.lastTapAt = 0;
      seekBy(side === "left" ? -10 : 10);
      return;
    }
    gestureRef.current.lastTapAt = now;
    gestureRef.current.lastSide = side;
    if (gestureSingleTimerRef.current) clearTimeout(gestureSingleTimerRef.current);
    gestureSingleTimerRef.current = setTimeout(() => {
      setSettings(false);
      if (controlsVisible) {
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        setControlsVisible(false);
      } else {
        showControls();
      }
    }, 320);
  };
  const toggleOrientation = async () => {
    const next = playerOrientation === "landscape" ? "portrait" : "landscape";
    setPlayerOrientation(next);
    const orientation = screen.orientation as ScreenOrientation & { lock?: (value: "portrait" | "landscape") => Promise<void> };
    await orientation.lock?.(next).catch(() => {});
  };
  const showCastPicker = async () => {
    const video = videoRef.current as (HTMLVideoElement & {
      webkitShowPlaybackTargetPicker?: () => void;
      remote?: { prompt: () => Promise<void> };
    }) | null;
    if (!video) return;
    if (typeof video.webkitShowPlaybackTargetPicker === "function") {
      video.webkitShowPlaybackTargetPicker();
      return;
    }
    if (video.remote?.prompt) {
      try { await video.remote.prompt(); return; } catch { return; }
    }
    window.alert("Энэ browser Cast/AirPlay дэмжихгүй байна. iPhone дээр AirPlay, Android дээр Chrome ашиглана уу.");
  };
  const toggleFullscreen = async () => {
    const frame = frameRef.current;
    if (inlineFullscreen) { setInlineFullscreen(false); void screen.orientation.unlock?.(); return; }
    if (document.fullscreenElement) { await document.exitFullscreen().catch(() => {}); return; }
    if (frame?.requestFullscreen) {
      try { await frame.requestFullscreen(); return; } catch { /* iOS uses the inline custom mode below. */ }
    }
    setInlineFullscreen(true);
  };
  const showControls = () => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (playing && !settings)
      controlsTimerRef.current = setTimeout(
        () => setControlsVisible(false),
        4200,
      );
  };
  useEffect(() => {
    showControls();
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [playing, settings]);
  const selectQuality = (value: string) => {
    setQuality(value);
    const player = playerRef.current;
    if (!player) return;
    if (value === "auto") {
      player.configure({ abr: { enabled: true } });
      return;
    }
    const track = qualities.find((item) => String(item.height) === value);
    if (track) {
      player.configure({ abr: { enabled: false } });
      player.selectVariantTrack(track, true);
    }
  };
  const changeRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) videoRef.current.playbackRate = rate;
  };
  const handleKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (["INPUT", "SELECT"].includes((event.target as HTMLElement).tagName))
      return;
    const video = videoRef.current;
    if (!video) return;
    if (event.key === " " || event.key.toLowerCase() === "k") {
      event.preventDefault();
      togglePlay();
    } else if (event.key === "ArrowLeft") video.currentTime -= 10;
    else if (event.key === "ArrowRight") video.currentTime += 10;
    else if (event.key.toLowerCase() === "m") {
      video.muted = !video.muted;
      setMuted(video.muted);
    } else if (event.key.toLowerCase() === "f") toggleFullscreen();
    else if (event.key.toLowerCase() === "c")
      setActiveSubtitle((value) =>
        value === "off" ? (subtitles[0]?.id ?? "off") : "off",
      );
  };
  return (
    <div
      ref={frameRef}
      className={`cinema-player ${inlineFullscreen ? `inline-fullscreen force-${playerOrientation}` : ""} ${controlsVisible || settings ? "controls-visible" : "controls-hidden"}`}
      tabIndex={0}
      onKeyDown={handleKey}
      onMouseMove={showControls}
      onMouseLeave={() => {
        if (playing && !settings) setControlsVisible(false);
      }}
      style={
        {
          "--subtitle-size": `${subtitleSize}%`,
          "--subtitle-color": subtitleColor,
        } as React.CSSProperties
      }
      onContextMenu={(event) => event.preventDefault()}
    >
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        muted={autoPlay}
        playsInline
        preload="metadata"
        controlsList="nodownload"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => {
          setBuffering(false);
          setError("");
        }}
        onLoadedMetadata={() => setState("Тоглуулахад бэлэн")}
        onError={(event) => {
          const mediaError = event.currentTarget.error;
          if (mediaError)
            setError(
              mediaError.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
                ? "Энэ видеоны формат утасны browser-т дэмжигдэхгүй байна. MP4 H.264 хэлбэрээр хөрвүүлнэ үү."
                : "Видео ачаалж чадсангүй. Дахин оролдоно уу.",
            );
        }}
        onPlay={() => {
          setPlaying(true);
          if (recentItem) {
            try {
              const saved = JSON.parse(localStorage.getItem(recentlyWatchedKey) ?? "[]") as RecentWatchItem[];
              localStorage.setItem(recentlyWatchedKey, JSON.stringify([{ ...recentItem, watchedAt: Date.now() }, ...saved.filter((entry) => entry.id !== recentItem.id)].slice(0, 20)));
            } catch { /* Recent history must never interrupt playback. */ }
          }
          if (movieId && !viewRecordedRef.current) {
            viewRecordedRef.current = true;
            void fetch("/api/analytics/view", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ movieId }) });
          }
        }}
        onPause={() => {
          setPlaying(false);
          setControlsVisible(true);
        }}
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          setCurrent(video.currentTime);
          if (video.seekable.length) {
            setSeekStart(video.seekable.start(0));
            setSeekEnd(video.seekable.end(video.seekable.length - 1));
          }
        }}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onVolumeChange={(event) => {
          setVolume(event.currentTarget.volume);
          setMuted(event.currentTarget.muted);
        }}
        aria-label={`${title} видео тоглуулагч`}
      >
        {subtitles.map((track) => (
          <track
            key={track.id}
            src={`/api/subtitles/${track.key}`}
            kind="subtitles"
            srcLang={track.language}
            label={track.label}
            default={track.id === subtitles[0]?.id}
          />
        ))}
      </video>
      <div className="mobile-gesture-layer" onPointerDown={gesturePointerDown} onPointerUp={(event) => finishGesture(event)} onPointerCancel={(event) => finishGesture(event, true)} />
      {seekFeedback && <div className={`tap-feedback ${seekFeedback < 0 ? "left" : "right"}`}><b>{seekFeedback > 0 ? "+10" : "−10"}</b><span>секунд</span></div>}
      {speedHolding && <div className="speed-feedback"><b>2×</b><span>Хурдасгаж байна</span></div>}
      {live && playing && muted && (
        <button
          className="live-unmute"
          onClick={() => {
            if (videoRef.current) videoRef.current.muted = false;
            setMuted(false);
          }}
        >
          🔊 Дуу асаах
        </button>
      )}
      {buffering && (
        <div className="player-loader">
          <i />
          <span>Уншиж байна</span>
        </div>
      )}
      {error && (
        <div className="player-error">
          <b>Тоглуулах боломжгүй</b>
          <span>{error}</span>
          <button onClick={() => window.location.reload()}>
            Дахин оролдох
          </button>
        </div>
      )}
      {!manifestUrl && (
        <div className="player-placeholder">
          <span className="player-orbit">▶</span>
          <h2>{title}</h2>
          <p>{state}</p>
        </div>
      )}
      <div className="player-brand">ХҮРЭЭ</div>
      {!playing && controlsVisible && !buffering && !error && manifestUrl && (
        <button
          className="center-play paused-only"
          onClick={togglePlay}
          aria-label="Тоглуулах"
        >
          <span className="play-symbol" />
        </button>
      )}
      <div className="player-shade" />
      <div className="player-controls">
        <input
          className="timeline"
          aria-label="Видео хугацаа"
          type="range"
          min={live ? seekStart : 0}
          max={(live ? seekEnd : duration) || 0}
          value={Math.min(
            Math.max(current, live ? seekStart : 0),
            (live ? seekEnd : duration) || 0,
          )}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (videoRef.current) videoRef.current.currentTime = value;
            setCurrent(value);
          }}
          style={
            {
              "--progress": `${(live ? seekEnd - seekStart : duration) ? ((current - (live ? seekStart : 0)) / (live ? seekEnd - seekStart : duration)) * 100 : 0}%`,
            } as React.CSSProperties
          }
        />
        <div className="control-row">
          <button
            onClick={togglePlay}
            aria-label={playing ? "Түр зогсоох" : "Тоглуулах"}
          >
            {playing ? <span className="pause-symbol" /> : <span className="play-symbol small" />}
          </button>
          <button
            onClick={() => seekBy(-10)}
            aria-label="10 секунд ухраах"
          >
            ↶<small>10</small>
          </button>
          <button
            onClick={() => seekBy(10)}
            aria-label="10 секунд урагшлуулах"
          >
            ↷<small>10</small>
          </button>
          <span className="timecode">
            {live
              ? `-${formatTime(Math.max(0, seekEnd - current))}`
              : `${formatTime(current)} / ${formatTime(duration)}`}
          </span>
          <button
            onClick={() => {
              const video = videoRef.current;
              if (video) {
                video.muted = !video.muted;
                setMuted(video.muted);
              }
            }}
            aria-label="Дуу хаах"
          >
            {muted || volume === 0 ? "🔇" : "🔊"}
          </button>
          <input
            className="volume-slider"
            aria-label="Дууны хэмжээ"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (videoRef.current) {
                videoRef.current.volume = value;
                videoRef.current.muted = false;
              }
              setVolume(value);
              setMuted(false);
            }}
          />
          <div className="player-title">
            <b>{title}</b>
            <span>Одоо үзэж байна</span>
          </div>
          {live && (
            <button
              className="live-edge"
              onClick={() => {
                if (videoRef.current && seekEnd)
                  videoRef.current.currentTime = seekEnd - 0.5;
              }}
            >
              ● LIVE
            </button>
          )}
          <button
            onClick={() =>
              setActiveSubtitle((currentTrack) =>
                currentTrack === "off" ? (subtitles[0]?.id ?? "off") : "off",
              )
            }
            className={activeSubtitle !== "off" ? "active" : ""}
            aria-label="Subtitle"
          >
            CC
          </button>
          <button
            onClick={() => setSettings((value) => !value)}
            className={settings ? "active" : ""}
            aria-label="Тохиргоо"
          >
            ⚙
          </button>
          <button className="cast-button" onClick={() => void showCastPicker()} aria-label="Зурагт руу дамжуулах">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM3 14a7 7 0 0 1 7 7M3 9a12 12 0 0 1 12 12M5 4h14a2 2 0 0 1 2 2v12"/></svg>
          </button>
          {inlineFullscreen && <button className="orientation-toggle" onClick={() => void toggleOrientation()} aria-label={playerOrientation === "landscape" ? "Босоо харах" : "Хэвтээ харах"}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x={playerOrientation === "landscape" ? "7" : "4"} y={playerOrientation === "landscape" ? "3" : "7"} width={playerOrientation === "landscape" ? "10" : "16"} height={playerOrientation === "landscape" ? "18" : "10"} rx="2"/><path d="M3 8a9 9 0 0 1 5-5M3 8V4m0 4h4M21 16a9 9 0 0 1-5 5m5-5v4m0-4h-4"/></svg></button>}
          <button onClick={toggleFullscreen} aria-label="Дэлгэц дүүргэх">
            ⛶
          </button>
        </div>
      </div>
      {settings && (
        <div className="player-settings">
          <div className="settings-head">
            <b>Тоглуулагчийн тохиргоо</b>
            <button onClick={() => setSettings(false)}>×</button>
          </div>
          <label>
            Видео чанар
            <select
              value={quality}
              onChange={(event) => selectQuality(event.target.value)}
            >
              <option value="auto">
                Auto
                {qualities.find((track) => track.active)?.height
                  ? ` · ${qualities.find((track) => track.active)?.height}p`
                  : ""}
              </option>
              {qualities.map((track) => (
                <option value={track.height} key={track.id}>
                  {track.height}p
                </option>
              ))}
            </select>
          </label>
          <label>
            Тоглуулах хурд
            <select
              value={playbackRate}
              onChange={(event) => changeRate(Number(event.target.value))}
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <option value={rate} key={rate}>
                  {rate === 1 ? "Хэвийн" : `${rate}×`}
                </option>
              ))}
            </select>
          </label>
          <label>
            Хэл
            <select
              value={activeSubtitle}
              onChange={(event) => setActiveSubtitle(event.target.value)}
            >
              <option value="off">Унтраах</option>
              {subtitles.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Үсгийн хэмжээ <span>{subtitleSize}%</span>
            <input
              type="range"
              min="70"
              max="180"
              value={subtitleSize}
              onChange={(event) => setSubtitleSize(Number(event.target.value))}
            />
          </label>
          <label>
            Subtitle байрлал
            <select
              value={subtitlePosition}
              onChange={(event) => setSubtitlePosition(event.target.value)}
            >
              <option value="12">Дээд</option>
              <option value="50">Гол</option>
              <option value="82">Доод</option>
              <option value="92">Хамгийн доод</option>
            </select>
          </label>
          <label>
            Үсгийн өнгө
            <div className="color-options">
              {["#ffffff", "#ffe55c", "#64d8ff", "#9cff8f"].map((color) => (
                <button
                  key={color}
                  aria-label={color}
                  className={subtitleColor === color ? "selected" : ""}
                  style={{ background: color }}
                  onClick={() => setSubtitleColor(color)}
                />
              ))}
            </div>
          </label>
          <small>
            {subtitles.length
              ? `${subtitles.length} subtitle боломжтой`
              : "Энэ кинонд subtitle нэмэгдээгүй"}
          </small>
          <div className="shortcut-hint">
            <span>Space Тоглуулах</span>
            <span>← → 10 секунд</span>
            <span>F Fullscreen</span>
          </div>
        </div>
      )}
    </div>
  );
}
