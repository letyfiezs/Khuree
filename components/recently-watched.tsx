"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AudioLabel } from "@/lib/content";
import { ResilientPoster } from "@/components/resilient-poster";

export type RecentWatchItem = {
  id: string;
  slug: string;
  title: string;
  posterUrl?: string;
  year?: number;
  age?: string;
  kind?: "movie" | "series";
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  audioLabel?: AudioLabel;
  watchedAt: number;
};

export const recentlyWatchedKey = "khuree-recently-watched";

export function RecentlyWatched() {
  const [items, setItems] = useState<RecentWatchItem[]>([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setItems(JSON.parse(localStorage.getItem(recentlyWatchedKey) ?? "[]")); } catch { setItems([]); }
  }, []);
  if (!items.length) return null;
  return <section className="catalog home-catalog recently-watched">
    <div className="section-heading"><div><p className="section-kicker">ҮРГЭЛЖЛҮҮЛЭН ҮЗЭХ</p><h2>Сүүлд үзсэн</h2></div><button onClick={() => { localStorage.removeItem(recentlyWatchedKey); setItems([]); }}>Жагсаалт цэвэрлэх</button></div>
    <div className="film-rail">{items.slice(0, 12).map((item) => <Link href={`/watch/${encodeURIComponent(item.slug)}`} className="film-card" key={item.id}>
      <div className={`poster ${item.posterUrl ? "has-poster" : ""}`} style={{ background: "linear-gradient(155deg,#4b0b12,#080808)" }}>
        {item.posterUrl && <ResilientPoster src={item.posterUrl} alt={item.seriesTitle || item.title} />}
        {item.audioLabel && <span className="audio-tag">{item.audioLabel === "Хэлтэй" ? "ХЭЛ" : "SUB"}</span>}<span className="film-tag">ҮРГЭЛЖЛҮҮЛЭХ</span>{!item.posterUrl && <span className="poster-title">{item.seriesTitle || item.title}</span>}<span className="play-chip">▶</span>
      </div>
      <h3>{item.seriesTitle || item.title}</h3>
      <p>{item.kind === "series" ? `${item.seasonNumber ?? 1}-р бүлэг · ${item.episodeNumber ?? 1}-р анги` : `${item.year ?? ""} · ${item.age ?? ""}`}</p>
    </Link>)}</div>
  </section>;
}
