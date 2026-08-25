"use client";
import { useEffect, useState } from "react";
import type { LiveChannel } from "@/lib/live-channels";

type Recording = {
  id: string;
  channelId: string;
  channelName: string;
  startedAt: string;
  status: "recording" | "finished" | "stopped" | "failed";
  published?: boolean;
};

export function AdminLive() {
  const [channels, setChannels] = useState<LiveChannel[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [minutes, setMinutes] = useState(30);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    const response = await fetch("/api/admin/live", { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as {
        channels: LiveChannel[];
        recordings: Recording[];
      };
      setChannels(data.channels);
      setRecordings(data.recordings);
    }
  };
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(timer);
  }, []);
  async function action(
    actionName: "start" | "stop" | "publish",
    payload: Record<string, unknown>,
  ) {
    setBusy(
      `${actionName}-${String(payload.channelId ?? payload.recordingId)}`,
    );
    setError("");
    const response = await fetch("/api/admin/live", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: actionName, ...payload }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) setError(data.error ?? "Үйлдэл амжилтгүй.");
    await load();
    setBusy("");
  }
  const activeIds = new Set(
    recordings
      .filter((item) => item.status === "recording")
      .map((item) => item.channelId),
  );
  return (
    <>
      <div className="admin-toolbar">
        <div>
          <h1>Live хяналт</h1>
          <p>{channels.length} суваг · бичлэг PC дээр хадгалагдана</p>
        </div>
        <label className="record-duration">
          Бичих хугацаа{" "}
          <input
            type="number"
            min="1"
            max="240"
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
          />{" "}
          минут
        </label>
      </div>
      <p className="rights-warning">
        Зөвхөн өөрийн эзэмшдэг эсвэл бичиж, дахин түгээх зөвшөөрөлтэй сувгийг
        архивлана уу.
      </p>
      {error && <p className="form-error">⚠ {error}</p>}
      <div className="live-admin-grid">
        {channels.map((channel) => {
          const recording = recordings.find(
            (item) =>
              item.channelId === channel.id && item.status === "recording",
          );
          return (
            <article key={channel.id}>
              <span className="live-dot" />
              <div>
                <b>{channel.name}</b>
                <small>{channel.category}</small>
              </div>
              {recording ? (
                <button
                  className="stop-record"
                  disabled={!!busy}
                  onClick={() =>
                    void action("stop", { recordingId: recording.id })
                  }
                >
                  ■ Зогсоох
                </button>
              ) : (
                <button
                  disabled={!!busy || activeIds.has(channel.id)}
                  onClick={() =>
                    void action("start", { channelId: channel.id, minutes })
                  }
                >
                  ● Бичих
                </button>
              )}
            </article>
          );
        })}
      </div>
      <div className="recording-list">
        <h2>Бичлэгийн архив</h2>
        {recordings.length === 0 && <p>Одоогоор бичлэг байхгүй.</p>}
        {recordings.map((recording) => (
          <article key={recording.id}>
            <div>
              <b>{recording.channelName}</b>
              <small>
                {new Date(recording.startedAt).toLocaleString("mn-MN")} ·{" "}
                {recording.status}
              </small>
            </div>
            <span
              className={`status ${recording.status === "recording" ? "processing" : "published"}`}
            >
              {recording.status === "recording"
                ? "Бичиж байна"
                : recording.status === "failed"
                  ? "Алдаатай"
                  : "Дууссан"}
            </span>
            {recording.status !== "recording" && !recording.published && (
              <button
                disabled={!!busy}
                onClick={() =>
                  void action("publish", { recordingId: recording.id })
                }
              >
                Каталогт нийтлэх
              </button>
            )}
            {recording.published && <em>Нийтэлсэн</em>}
          </article>
        ))}
      </div>
    </>
  );
}
