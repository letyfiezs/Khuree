"use client";
import { useState } from "react";
import Link from "next/link";

export function AdminLoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const password = new FormData(event.currentTarget).get("password");
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setLoading(false); setError(result.error ?? "Нэвтрэхэд алдаа гарлаа."); return; }
    window.location.href = "/admin";
  }
  return (
    <form className="admin-gate-card" onSubmit={submit}>
      <Link href="/" className="brand"><span>Х</span>ҮРЭЭ</Link>
      <p className="section-kicker">CONTENT STUDIO</p><h1>Админ нэвтрэх</h1>
      <p>Контент удирдлагын хэсэгт нэвтрэх нууц үгээ оруулна уу.</p>
      <label>Нууц үг<input name="password" type="password" required autoFocus autoComplete="current-password" placeholder="••••••••" /></label>
      {error && <div className="admin-gate-error">⚠ {error}</div>}
      <button className="primary-button" disabled={loading}>{loading ? "Шалгаж байна…" : "Нэвтрэх"}</button>
      <Link className="admin-gate-back" href="/">← Нүүр хуудас</Link>
    </form>
  );
}
