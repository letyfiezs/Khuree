"use client";

import { useState } from "react";

export function RecoveryEmailSettings({ currentEmail }: { currentEmail?: string }) {
  const [email, setEmail] = useState(currentEmail ?? "");
  const [code, setCode] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setMessage("");
    const response = await fetch("/api/account/recovery-email/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, currentPin }) });
    const data = await response.json() as { error?: string };
    setLoading(false);
    if (!response.ok) return setMessage(`⚠ ${data.error ?? "Код илгээж чадсангүй."}`);
    setSent(true); setCurrentPin(""); setMessage("✓ 6 оронтой код Gmail рүү илгээгдлээ.");
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setMessage("");
    const response = await fetch("/api/account/recovery-email/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
    const data = await response.json() as { error?: string; email?: string };
    setLoading(false);
    if (!response.ok) return setMessage(`⚠ ${data.error ?? "Код баталгаажсангүй."}`);
    setEmail(data.email ?? email); setCode(""); setSent(false); setMessage("✓ Сэргээх Gmail баталгаажиж хадгалагдлаа.");
  }

  return <form className="account-card password-change-card" onSubmit={sent ? verifyCode : requestCode}>
    <p className="section-kicker">RECOVERY EMAIL</p>
    <h2>PIN сэргээх Gmail</h2>
    <p className="password-help">PIN-ээ мартсан үед сэргээх код зөвхөн энд баталгаажуулсан Gmail рүү очно.</p>
    <label>Сэргээх Gmail<input value={email} onChange={(event) => { setEmail(event.target.value); setSent(false); setCode(""); }} type="email" autoComplete="email" required placeholder="name@gmail.com" /></label>
    {!sent && <label>Одоогийн нэвтрэх PIN<input value={currentPin} onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, "").slice(0, 4))} type="password" inputMode="numeric" autoComplete="current-password" required placeholder="••••" /></label>}
    {sent && <label>6 оронтой код<input className="otp-input" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required placeholder="000000" /></label>}
    {message && <p className="account-message">{message}</p>}
    <button className="primary-button" disabled={loading || (sent ? code.length !== 6 : currentPin.length !== 4)}>{loading ? "Түр хүлээнэ үү…" : sent ? "Gmail баталгаажуулах" : currentEmail ? "Gmail солих код авах" : "Код авах"}</button>
  </form>;
}
