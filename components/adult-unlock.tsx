"use client";
import { useState } from "react";
export function AdultUnlock({ returnTo }: { returnTo: string }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/account/unlock-adult", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (response.ok) window.location.href = returnTo;
    else setError("PIN буруу байна.");
  }
  return (
    <form className="adult-unlock" onSubmit={submit}>
      <i>18+</i>
      <h1>Насанд хүрэгчдийн хэсэг</h1>
      <p>Parental PIN-ээ оруулж үргэлжлүүлнэ үү.</p>
      <input
        value={pin}
        onChange={(event) =>
          setPin(event.target.value.replace(/\D/g, "").slice(0, 4))
        }
        inputMode="numeric"
        type="password"
        placeholder="4 оронтой PIN"
        autoFocus
      />
      {error && <span>{error}</span>}
      <button className="primary-button">Нээх</button>
    </form>
  );
}
