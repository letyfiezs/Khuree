"use client";
import { useState } from "react";
import type { LocalUser } from "@/lib/auth/local-auth";
import { MyDevices } from "./my-devices";
export function AccountSettings({ user }: { user: LocalUser }) {
  const [name, setName] = useState(user.name);
  const [adultEnabled, setAdultEnabled] = useState(user.adultEnabled);
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        adultEnabled,
        parentalPin: pin || undefined,
        currentPassword: password,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    setMessage(
      response.ok
        ? "✓ Тохиргоо хадгалагдлаа."
        : `⚠ ${data.error ?? "Алдаа гарлаа."}`,
    );
    if (response.ok) {
      setPin("");
      setPassword("");
    }
  }
  return (
    <div className="account-settings-stack"><form className="account-card" onSubmit={save}>
      <p className="section-kicker">ACCOUNT SETTINGS</p>
      <h1>Миний бүртгэл</h1>
      <label>
        Нэр
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        {user.phone ? "Утасны дугаар" : "Имэйл"}
        <input value={user.phone || user.email} disabled />
      </label>
      <div className="parental-setting">
        <div>
          <b>18+ контент</b>
          <small>Parental PIN-ээр хамгаалж нээнэ.</small>
        </div>
        <input
          type="checkbox"
          checked={adultEnabled}
          onChange={(event) => setAdultEnabled(event.target.checked)}
        />
      </div>
      {adultEnabled && (
        <label>
          {user.hasParentalPin
            ? "Шинэ PIN (солихгүй бол хоосон)"
            : "4 оронтой parental PIN"}
          <input
            value={pin}
            onChange={(event) =>
              setPin(event.target.value.replace(/\D/g, "").slice(0, 4))
            }
            inputMode="numeric"
            type="password"
            placeholder="••••"
          />
        </label>
      )}
      <label>
        {user.loginKind ? "Баталгаажуулах 4 оронтой нэвтрэх PIN" : "Баталгаажуулах одоогийн нууц үг"}
        <input
          value={password}
          onChange={(event) => setPassword(user.loginKind ? event.target.value.replace(/\D/g, "").slice(0, 4) : event.target.value)}
          type="password"
          inputMode={user.loginKind ? "numeric" : undefined}
          autoComplete="current-password"
          placeholder={user.loginKind ? "••••" : undefined}
          required
        />
      </label>
      {message && <p className="account-message">{message}</p>}
      <button className="primary-button" disabled={saving}>
        {saving ? "Хадгалж байна…" : "Тохиргоо хадгалах"}
      </button>
    </form><MyDevices /></div>
  );
}
