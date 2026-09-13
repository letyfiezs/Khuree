"use client";

import { useCallback, useEffect, useState } from "react";

type Monitor = {
  updatedAt: string;
  server: { available: boolean; platform: string; health: "healthy" | "warning" | "critical" | "unknown"; cpu?: { percent: number; cores: number; load: number[] }; memory?: { total: number; used: number; percent: number }; disk?: { total: number; used: number; percent: number }; network?: { receivedPerSecond: number; sentPerSecond: number; sampled: boolean }; uptimeSeconds?: number; process?: { uptimeSeconds: number; memoryBytes: number } };
  streams: { activeStreams: number; measuredStreams: number; bitrateKbps: number; averageBitrateKbps: number };
};

const bytes = (value: number) => value >= 1_000_000_000 ? `${(value / 1_000_000_000).toFixed(1)} GB` : `${(value / 1_000_000).toFixed(0)} MB`;
const rate = (value: number) => value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)} MB/s` : `${Math.round(value / 1_000)} KB/s`;
const bitrate = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)} Mbps` : `${value} Kbps`;
const uptime = (value: number) => value >= 86400 ? `${Math.floor(value / 86400)} өдөр ${Math.floor(value % 86400 / 3600)} цаг` : `${Math.floor(value / 3600)} цаг ${Math.floor(value % 3600 / 60)} мин`;

export function AdminServerMonitor() {
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/system", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setMonitor(await response.json()); setError("");
    } catch { setError("VPS-ийн төлөвийг уншиж чадсангүй."); }
  }, []);
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 15_000); return () => window.clearInterval(timer); }, [load]);
  const server = monitor?.server;
  const healthLabel = server?.health === "healthy" ? "ХЭВИЙН" : server?.health === "warning" ? "АНХААР" : server?.health === "critical" ? "АЧААЛАЛТАЙ" : "ШАЛГАЖ БАЙНА";
  return <section className="server-monitor">
    <div className="panel-title"><div><h2>VPS хяналт</h2><p>15 секунд тутам шинэчлэгдэнэ · видео R2-оос хэрэглэгч рүү шууд явна</p></div><span className={`server-health ${server?.health ?? "unknown"}`}><i />{healthLabel}</span></div>
    {error && <p className="stats-error">{error}</p>}
    {!server?.available ? <p className="server-unavailable">VPS орчинд хэмжилт авах боломжгүй байна.</p> : <>
      <div className="server-metric-grid">
        <article><span>CPU</span><b>{server.cpu?.percent.toFixed(1)}%</b><small>{server.cpu?.cores} core · load {server.cpu?.load[0]}</small><i><em style={{ width: `${server.cpu?.percent ?? 0}%` }} /></i></article>
        <article><span>RAM</span><b>{server.memory?.percent.toFixed(1)}%</b><small>{bytes(server.memory?.used ?? 0)} / {bytes(server.memory?.total ?? 0)}</small><i><em style={{ width: `${server.memory?.percent ?? 0}%` }} /></i></article>
        <article><span>DISK</span><b>{server.disk?.percent.toFixed(1)}%</b><small>{bytes(server.disk?.used ?? 0)} / {bytes(server.disk?.total ?? 0)}</small><i><em style={{ width: `${server.disk?.percent ?? 0}%` }} /></i></article>
        <article><span>VPS NETWORK</span><b>↓ {server.network?.sampled ? rate(server.network.receivedPerSecond) : "…"}</b><small>↑ {server.network?.sampled ? rate(server.network.sentPerSecond) : "Хэмжиж байна"}</small></article>
      </div>
      <div className="server-stream-grid">
        <article><span>ИДЭВХТЭЙ STREAM</span><b>{monitor?.streams.activeStreams ?? 0}</b><small>Сүүлийн 45 секундэд player-ээс дохио ирсэн session</small></article>
        <article><span>ТООЦООЛСОН STREAM BITRATE</span><b>{monitor?.streams.measuredStreams ? bitrate(monitor.streams.bitrateKbps) : "—"}</b><small>{monitor?.streams.measuredStreams ? `${monitor.streams.measuredStreams} stream · дундаж ${bitrate(monitor.streams.averageBitrateKbps)}` : "Чанарын мэдээлэл цуглармагц гарна"}</small></article>
        <article><span>APP PROCESS</span><b>{server.process ? bytes(server.process.memoryBytes) : "—"}</b><small>{server.process ? `${uptime(server.process.uptimeSeconds)} ажиллаж байна` : "—"}</small></article>
        <article><span>VPS UPTIME</span><b>{server.uptimeSeconds ? uptime(server.uptimeSeconds) : "—"}</b><small>{monitor ? `Шинэчлэгдсэн ${new Date(monitor.updatedAt).toLocaleTimeString("mn-MN")}` : "—"}</small></article>
      </div>
    </>}
  </section>;
}
