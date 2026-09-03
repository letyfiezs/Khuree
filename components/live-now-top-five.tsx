"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ResilientPoster } from "@/components/resilient-poster";

const REFRESH_INTERVAL_MS = 10_000;

type LiveMovie = {
  id: string;
  slug: string;
  title: string;
  posterUrl: string | null;
  year: number | null;
  kind: "movie" | "series";
  seriesId: string | null;
  viewerCount: number;
};

export function LiveNowTopFive() {
  const [items, setItems] = useState<LiveMovie[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/analytics/live", { cache: "no-store", signal });
      const payload = await response.json() as { items?: LiveMovie[] };
      if (!response.ok || !payload.items) {
        setLoaded(true);
        return;
      }
      setItems(payload.items);
      setLoaded(true);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      if (document.visibilityState === "visible") void load(controller.signal);
    };
    refresh();
    const timer = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  return (
    <section className="catalog home-catalog live-now-catalog">
      <div className="section-heading">
        <div>
          <p className="section-kicker live-kicker"><i /> LIVE · ЯГ ОДОО</p>
          <h2>Одоо хамгийн их үзэж буй Top 5</h2>
        </div>
      </div>
      {items.length ? (
        <div className="film-rail live-now-rail">
          {items.map((item, index) => (
            <Link
              href={item.kind === "series" && item.seriesId ? `/series/${item.seriesId}` : `/movie/${encodeURIComponent(item.slug)}`}
              className="film-card live-movie-card"
              key={item.id}
            >
              <div className={`poster ${item.posterUrl ? "has-poster" : ""}`}>
                {item.posterUrl && <ResilientPoster src={item.posterUrl} alt={item.title} />}
                {!item.posterUrl && <span className="poster-title">{item.title}</span>}
                <strong className="live-rank">#{index + 1}</strong>
                <span className="live-viewer-badge"><i /> {item.viewerCount} хүн үзэж байна</span>
                <span className="play-chip">▶</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.year ?? "Шинэ"} · яг одоо {item.viewerCount} үзэгч</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="live-empty">{loaded ? "Одоогоор кино үзэж байгаа идэвхтэй үзэгч алга." : "Live үзэлтийг уншиж байна…"}</p>
      )}
    </section>
  );
}
