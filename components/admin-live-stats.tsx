"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type StorageCategory = { bytes: number; objects: number };
type Stats = { updatedAt: string; storage: { bytes: number; objects: number; limitBytes: number; freeTierBytes: number; remainingBytes: number; percent: number; estimatedStorageUsd: number; breakdown: Record<"video" | "subtitle" | "thumbnail" | "hero" | "other", StorageCategory> }; movies: number; users: number; totalViews: number; uniqueViews: number; todayViews: number; uniqueViewers7d: number; days: { date: string; views: number }[]; topMovies: { title: string; views: number }[] };
type Recent = { id: string; title: string; year: number; kind: string; status: string; accent: string };
const gb = (bytes: number) => `${(bytes / 1_000_000_000).toFixed(2)} GB`;

export function AdminLiveStats({ recent }: { recent: Recent[] }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/stats", { cache: "no-store" });
    if (!response.ok) { setError("Статистик татаж чадсангүй."); return; }
    setStats(await response.json()); setError("");
  }, []);
  useEffect(() => { const first = window.setTimeout(() => void load(), 0); const timer = window.setInterval(() => void load(), 15000); return () => { clearTimeout(first); clearInterval(timer); }; }, [load]);
  const max = Math.max(1, ...(stats?.days.map((day) => day.views) ?? [1]));
  const storageCategories = [
    { key: "video" as const, label: "Видео", color: "#e50914" },
    { key: "subtitle" as const, label: "Subtitle", color: "#35c77d" },
    { key: "thumbnail" as const, label: "Thumbnail / Poster", color: "#f4b942" },
    { key: "hero" as const, label: "Hero / Backdrop", color: "#6578ff" },
    { key: "other" as const, label: "Бусад", color: "#777780" },
  ];
  let storageCursor = 0;
  const storageGradient = stats ? `conic-gradient(${storageCategories.map((category) => {
    const start = storageCursor;
    storageCursor += stats.storage.bytes ? stats.storage.breakdown[category.key].bytes / stats.storage.bytes * 100 : 0;
    return `${category.color} ${start}% ${storageCursor}%`;
  }).join(",")})` : "#252529";
  return <>
    <div className="live-stats-head"><span><i /> LIVE</span><small>{stats ? `Шинэчилсэн ${new Date(stats.updatedAt).toLocaleTimeString("mn-MN")}` : "Уншиж байна…"}</small><button onClick={() => void load()}>↻ Шинэчлэх</button></div>
    {error && <p className="stats-error">{error}</p>}
    <div className="stats">
      <article><span>R2 АШИГЛАСАН</span><b>{stats ? gb(stats.storage.bytes) : "—"}</b><small>{stats ? `${stats.storage.objects} файл · ${stats.storage.percent.toFixed(1)}%` : "Cloudflare R2"}</small></article>
      <article><span>990 GB-С ҮЛДСЭН</span><b>{stats ? gb(stats.storage.remainingBytes) : "—"}</b><small>Хатуу upload хязгаар · free tier 10 GB</small><div className="storage-meter"><i style={{ width: `${stats?.storage.percent ?? 0}%` }} /></div></article>
      <article><span>САРЫН STORAGE ТООЦОО</span><b>{stats ? `$${stats.storage.estimatedStorageUsd.toFixed(2)}` : "—"}</b><small>Ойролцоогоор · request зардал ороогүй</small></article>
      <article><span>НИЙТ ҮЗЭЛТ</span><b>{stats?.totalViews ?? "—"}</b><small>Бодит play event</small></article>
      <article><span>ДАВТАГДААГҮЙ ҮЗЭЛТ</span><b>{stats?.uniqueViews ?? "—"}</b><small>1 хэрэглэгч · 1 кино = 1 үзэлт</small></article>
      <article><span>ӨНӨӨДӨР</span><b>{stats?.todayViews ?? "—"}</b><small>{stats?.uniqueViewers7d ?? 0} давтагдаагүй үзэгч / 7 хоног</small></article>
      <article><span>НИЙТ КИНО</span><b>{stats?.movies ?? "—"}</b><small>Supabase</small></article>
      <article><span>ХЭРЭГЛЭГЧ</span><b>{stats?.users ?? "—"}</b><small>Бүртгэлтэй хэрэглэгч</small></article>
    </div>
    <section className="storage-breakdown-panel">
      <div className="panel-title"><div><h2>R2 файлын дэлгэрэнгүй</h2><p>Файлын төрөл тус бүрийн бодит тоо ба хэмжээ</p></div><span>{stats?.storage.objects ?? 0} файл</span></div>
      <div className="storage-breakdown-body">
        <div className="storage-donut" style={{ background: storageGradient }}><div><b>{stats ? gb(stats.storage.bytes) : "—"}</b><small>нийт ашигласан</small></div></div>
        <div className="storage-category-list">{storageCategories.map((category) => {
          const value = stats?.storage.breakdown[category.key] ?? { bytes: 0, objects: 0 };
          const percent = stats?.storage.bytes ? value.bytes / stats.storage.bytes * 100 : 0;
          return <article key={category.key}><i style={{ background: category.color }} /><span><b>{category.label}</b><small>{value.objects} файл · {gb(value.bytes)}</small></span><em>{percent < 0.1 && percent > 0 ? "<0.1" : percent.toFixed(1)}%</em></article>;
        })}</div>
      </div>
    </section>
    <div className="admin-panels live-analytics-panels">
      <article><div className="panel-title"><h2>7 хоногийн бодит үзэлт</h2><span>{stats?.days.reduce((sum, day) => sum + day.views, 0) ?? 0}</span></div><div className="chart">{(stats?.days ?? Array.from({ length: 7 }, (_, i) => ({ date: String(i), views: 0 }))).map((day) => <i key={day.date} title={`${day.date}: ${day.views}`} style={{ height: `${Math.max(4, day.views / max * 100)}%` }} />)}</div></article>
      <article><div className="panel-title"><h2>Их үзэлттэй кино</h2><span>UNIQUE</span></div><div className="top-movies">{stats?.topMovies.length ? stats.topMovies.map((movie, index) => <div key={movie.title}><b>{index + 1}</b><span>{movie.title}</span><em>{movie.views} давтагдаагүй</em></div>) : <p>Үзэлт бүртгэгдээгүй байна.</p>}</div></article>
      <article><div className="panel-title"><h2>Сүүлийн бүтээлүүд</h2><Link href="/admin/movies">Бүгдийг харах →</Link></div>{recent.map((item) => <div className="recent-item" key={item.id}><i style={{ background: item.accent }} /><span><b>{item.title}</b><small>{item.kind === "movie" ? "Кино" : "Цуврал"} · {item.year}</small></span><em className={`status ${item.status}`}>Нийтэлсэн</em></div>)}</article>
    </div>
  </>;
}
