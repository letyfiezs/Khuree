"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const search = useSearchParams();
  const [kind, setKind] = useState<"phone" | "email">("phone");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const returnTo = search.get("returnTo");
  const switchPath = mode === "login" ? "/signup" : "/login";
  const switchHref = returnTo ? `${switchPath}?returnTo=${encodeURIComponent(returnTo)}` : switchPath;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch(`/api/auth/pin/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, identifier: kind === "phone" ? `+976${identifier}` : identifier.trim().toLowerCase(), pin, name: name.trim(), returnTo: returnTo ?? "" }),
    });
    const data = await response.json() as { error?: string; returnTo?: string };
    setLoading(false);
    if (!response.ok) return setError(data.error ?? "Алдаа гарлаа.");
    window.location.href = data.returnTo ?? "/";
  }

  const valid = kind === "phone" ? /^\d{8}$/.test(identifier) : /^\S+@\S+\.\S+$/.test(identifier);
  return (
    <form onSubmit={submit} className="auth-form">
      <div className="auth-heading"><p className="section-kicker">{mode === "login" ? "ТАВТАЙ МОРИЛ" : "ШИНЭ ГИШҮҮН"}</p><h1>{mode === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}</h1><span>Баталгаажуулах SMS, имэйл шаардлагагүй. 4 оронтой PIN-ээ марталгүй хадгална уу.</span></div>
      <div className="auth-kind-tabs"><button type="button" className={kind === "phone" ? "active" : ""} onClick={() => { setKind("phone"); setIdentifier(""); setError(""); }}>Утасны дугаар</button><button type="button" className={kind === "email" ? "active" : ""} onClick={() => { setKind("email"); setIdentifier(""); setError(""); }}>Имэйл</button></div>
      {mode === "signup" && <label>Таны нэр<input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Нэр" autoComplete="name" /></label>}
      <label>{kind === "phone" ? "Утасны дугаар" : "Имэйл хаяг"}{kind === "phone" ? <div className="phone-input"><span>+976</span><input value={identifier} onChange={(event) => setIdentifier(event.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" autoComplete="tel-national" placeholder="99112233" /></div> : <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} type="email" autoComplete="email" placeholder="name@example.com" />}</label>
      <label>4 оронтой PIN<input className="otp-input pin-input" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="••••" /></label>
      {error && <p className="form-error">⚠ {error}</p>}
      <button className="primary-button" disabled={loading || !valid || pin.length !== 4 || (mode === "signup" && !name.trim())}>{loading ? "Түр хүлээнэ үү…" : mode === "login" ? "Шууд нэвтрэх" : "Бүртгэл үүсгэх"}</button>
      <p className="auth-switch">{mode === "login" ? "Бүртгэлгүй юу?" : "Бүртгэлтэй юу?"} <Link href={switchHref}>{mode === "login" ? "Бүртгүүлэх" : "Нэвтрэх"}</Link></p>
    </form>
  );
}
