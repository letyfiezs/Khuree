"use client";
import { useState } from "react";
import type { PricingSettings } from "@/lib/pricing";

const labels: Partial<Record<keyof PricingSettings, string>> = {
  vip: "VIP багц",
  planDays: "Багцын хугацаа (хоног)", defaultRentalPrice: "Киноны үндсэн түрээс", rentalHours: "Түрээсийн хугацаа (цаг)",
};
const editableKeys = ["vip", "planDays", "defaultRentalPrice", "rentalHours"] as const;

export function AdminPricing({ initial }: { initial: PricingSettings }) {
  const [values, setValues] = useState(initial); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    const response = await fetch("/api/admin/pricing", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
    const data = await response.json() as { error?: string }; setSaving(false);
    setMessage(response.ok ? "✓ Үнэ амжилттай шинэчлэгдлээ." : data.error ?? "Хадгалж чадсангүй.");
  }
  return <form className="admin-pricing" onSubmit={save}><div className="admin-toolbar"><div><p className="section-kicker">ТӨЛБӨРИЙН ТОХИРГОО</p><h1>Үнэ ба хугацаа</h1><p>VIP багц болон киноны түрээсийн үнэ, хугацааг эндээс удирдана.</p></div><button className="primary-button" disabled={saving}>{saving ? "Хадгалж байна…" : "Үнэ хадгалах"}</button></div><div className="pricing-grid">{editableKeys.map((key) => { const duration = key.endsWith("Hours") || key.endsWith("Days"); return <label key={key}>{labels[key]}<input type="number" min={duration ? 1 : 100} step={duration ? 1 : 100} value={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: Number(event.target.value) }))} /><small>{key.endsWith("Hours") ? "цаг" : key.endsWith("Days") ? "хоног" : "₮"}</small></label>; })}</div>{message && <p className="pricing-message">{message}</p>}</form>;
}
