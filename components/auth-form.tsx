"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function RecoveryForm({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<"email" | "otp" | "password" | "done">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (!cooldown) return; const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer); }, [cooldown]);
  async function requestCode(event?: React.FormEvent) {
    event?.preventDefault();
    setLoading(true); setError("");
    const response = await fetch("/api/auth/recovery/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await response.json() as { error?: string };
    setLoading(false);
    if (!response.ok) return setError(data.error ?? "Имэйл хаяг буруу байна.");
    setStep("otp"); setCooldown(60);
  }
  async function verifyCode(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const response = await fetch("/api/auth/recovery/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, token: code }) });
    const data = await response.json() as { error?: string };
    setLoading(false); if (!response.ok) return setError(data.error ?? "Код буруу байна."); setStep("password");
  }
  async function updatePassword(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (password.length < 8) return setError("Нууц үг 8-аас дээш тэмдэгттэй байна.");
    if (password !== repeat) return setError("Нууц үг таарахгүй байна.");
    setLoading(true);
    const response = await fetch("/api/auth/recovery/update", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    const data = await response.json() as { error?: string };
    setLoading(false); if (!response.ok) return setError(data.error ?? "Нууц үг шинэчилж чадсангүй."); setStep("done");
  }
  if (step === "done") return <div className="auth-success"><i>✓</i><h2>Нууц үг амжилттай шинэчлэгдлээ.</h2><button className="primary-button" onClick={onBack}>Нэвтрэх</button></div>;
  const titles = { email: "Нууц үг сэргээх", otp: "Баталгаажуулах код", password: "Шинэ нууц үг" };
  const descriptions = { email: "Бүртгэлтэй и-мэйл хаягаа оруулна уу.", otp: "Таны и-мэйл хаяг руу илгээсэн кодыг оруулна уу.", password: "Шинэ нууц үгээ тохируулна уу." };
  return <form onSubmit={step === "email" ? requestCode : step === "otp" ? verifyCode : updatePassword} className="auth-form recovery-form">
    <button type="button" className="auth-back" onClick={onBack}>← Нэвтрэх рүү буцах</button>
    <div className="auth-heading"><p className="section-kicker">ХҮРЭЭ AUTH</p><h1>{titles[step]}</h1><span>{descriptions[step]}</span></div>
    {step === "email" && <label>И-мэйл хаяг<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required placeholder="name@example.com" /></label>}
    {step === "otp" && <><label>6 оронтой код<input className="otp-input" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required placeholder="000000" /></label><button type="button" className="auth-back" disabled={loading || cooldown > 0} onClick={() => void requestCode()}>{cooldown ? `Код дахин авах (${cooldown})` : "Код дахин авах"}</button></>}
    {step === "password" && <><label>Шинэ нууц үг<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" required /></label><label>Шинэ нууц үгээ давтах<input value={repeat} onChange={(event) => setRepeat(event.target.value)} type="password" autoComplete="new-password" required /></label></>}
    {error && <p className="form-error">⚠ {error}</p>}
    <button className="primary-button" disabled={loading || (step === "otp" && code.length !== 6)}>{loading ? "Түр хүлээнэ үү…" : step === "email" ? "Код авах" : step === "otp" ? "Баталгаажуулах" : "Нууц үг шинэчлэх"}</button>
  </form>;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const search = useSearchParams();
  const [kind, setKind] = useState<"phone" | "email">("phone");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const returnTo = search.get("returnTo");
  const switchPath = mode === "login" ? "/signup" : "/login";
  const switchHref = returnTo ? `${switchPath}?returnTo=${encodeURIComponent(returnTo)}` : switchPath;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/pin/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, identifier: kind === "phone" ? `+976${identifier}` : identifier.trim().toLowerCase(), pin, name: name.trim(), returnTo: returnTo ?? "" }),
      });
      const data = await response.json() as { error?: string; returnTo?: string };
      if (!response.ok) return setError(data.error ?? "Алдаа гарлаа.");
      window.location.href = data.returnTo ?? "/";
    } catch {
      setError("Нэвтрэх хүсэлт амжилтгүй боллоо. Дахин оролдоно уу.");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "login" && recovering) return <RecoveryForm onBack={() => setRecovering(false)} />;
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
      {mode === "login" && <button type="button" className="recovery-link" onClick={() => setRecovering(true)}>Нууц үгээ мартсан?</button>}
      <p className="auth-switch">{mode === "login" ? "Бүртгэлгүй юу?" : "Бүртгэлтэй юу?"} <Link href={switchHref}>{mode === "login" ? "Бүртгүүлэх" : "Нэвтрэх"}</Link></p>
    </form>
  );
}
