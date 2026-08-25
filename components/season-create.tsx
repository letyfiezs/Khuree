"use client";
import { useState } from "react";
export function SeasonCreate({
  seriesId,
  nextNumber,
}: {
  seriesId: string;
  nextNumber: number;
}) {
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState(nextNumber);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  async function create(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(`/api/admin/series/${seriesId}/seasons`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ number, title }),
    });
    const data = (await response.json()) as {
      season?: { id: string };
      error?: string;
    };
    if (!response.ok || !data.season)
      return setError(data.error ?? "Алдаа гарлаа.");
    window.location.href = `/admin/series/${seriesId}?season=${data.season.id}`;
  }
  return (
    <>
      {!open ? (
        <button className="primary-button" onClick={() => setOpen(true)}>
          ＋ Бүлэг үүсгэх
        </button>
      ) : (
        <form className="season-inline" onSubmit={create}>
          <input
            type="number"
            min="1"
            value={number}
            onChange={(e) => setNumber(Number(e.target.value))}
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${number}-р бүлэг`}
          />
          <button className="primary-button">Үүсгэх</button>
          {error && <span>{error}</span>}
        </form>
      )}
    </>
  );
}
