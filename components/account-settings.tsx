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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (adultEnabled && !user.hasParentalPin && pin.length !== 4) {
      setMessage("⚠ 18+ контент идэвхжүүлэхийн тулд 4 оронтой parental PIN оруулна уу.");
      return;
    }
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
  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    const isPin = user.credentialKind === "pin";
    if (newPassword !== confirmPassword) return setPasswordMessage(`⚠ Шинэ ${isPin ? "PIN-үүд" : "нууц үгс"} таарахгүй байна.`);
    if (isPin && (!/^\d{4}$/.test(currentPassword) || !/^\d{4}$/.test(newPassword))) return setPasswordMessage("⚠ Одоогийн болон шинэ PIN яг 4 оронтой байна.");
    if (!isPin && newPassword.length < 8) return setPasswordMessage("⚠ Шинэ нууц үг дор хаяж 8 тэмдэгттэй байна.");
    setPasswordSaving(true); setPasswordMessage("");
    const response = await fetch("/api/account/password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword, confirmPassword }) });
    const data = await response.json() as { error?: string };
    setPasswordSaving(false);
    if (!response.ok) return setPasswordMessage(`⚠ ${data.error ?? "Нууц үг шинэчилж чадсангүй."}`);
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    setPasswordMessage(`✓ ${isPin ? "Нэвтрэх PIN" : "Нууц үг"} амжилттай шинэчлэгдлээ.`);
  }
  const isPin = user.credentialKind === "pin";
  const credentialInput = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement>) => setter(isPin ? event.target.value.replace(/\D/g, "").slice(0, 4) : event.target.value);
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
            required={!user.hasParentalPin}
          />
        </label>
      )}
      {user.credentialKind !== "oauth" && <label>
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
      </label>}
      {message && <p className="account-message">{message}</p>}
      <button className="primary-button" disabled={saving}>
        {saving ? "Хадгалж байна…" : "Тохиргоо хадгалах"}
      </button>
    </form><form className="account-card password-change-card" onSubmit={changePassword}>
      <p className="section-kicker">LOGIN SECURITY</p>
      <h2>{isPin ? "Нэвтрэх PIN солих" : user.credentialKind === "oauth" ? "Нууц үг үүсгэх" : "Нууц үг солих"}</h2>
      {user.credentialKind === "oauth" ? <p className="password-help">Та Google-ээр нэвтэрсэн тул хуучин нууц үг байхгүй. Эндээс шинэ нууц үг үүсгэсний дараа имэйлээрээ мөн нэвтэрч болно.</p> : <label>Хуучин {isPin ? "PIN" : "нууц үг"}<input value={currentPassword} onChange={credentialInput(setCurrentPassword)} type="password" inputMode={isPin ? "numeric" : undefined} autoComplete="current-password" required /></label>}
      <label>Шинэ {isPin ? "PIN" : "нууц үг"}<input value={newPassword} onChange={credentialInput(setNewPassword)} type="password" inputMode={isPin ? "numeric" : undefined} autoComplete="new-password" minLength={isPin ? 4 : 8} required /></label>
      <label>Шинэ {isPin ? "PIN" : "нууц үг"} баталгаажуулах<input value={confirmPassword} onChange={credentialInput(setConfirmPassword)} type="password" inputMode={isPin ? "numeric" : undefined} autoComplete="new-password" minLength={isPin ? 4 : 8} required /></label>
      <small className="password-rule">{isPin ? "PIN яг 4 оронтой байна." : "Нууц үг дор хаяж 8 тэмдэгттэй байна."}</small>
      {passwordMessage && <p className="account-message">{passwordMessage}</p>}
      <button className="primary-button" disabled={passwordSaving}>{passwordSaving ? "Шинэчилж байна…" : isPin ? "PIN шинэчлэх" : "Нууц үг шинэчлэх"}</button>
    </form><MyDevices /></div>
  );
}
