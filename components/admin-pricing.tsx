"use client";
import { useState } from "react";
import type { PricingSettings } from "@/lib/pricing";

const labels: Record<keyof PricingSettings, string> = {
  movie: "Кино багц", series: "Олон ангит багц", vertical: "Босоо драма багц", adult: "+18 багц", vip: "VIP багц",
  planDays: "Багцын хугацаа (хоног)", defaultRentalPrice: "Киноны үндсэн түрээс", rentalHours: "Түрээсийн хугацаа (цаг)",
};

export function AdminPricing({ initial }: { initial: PricingSettings }) {
  const [values, setValues] = useState(initial); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    const response = await fetch("/api/admin/pricing", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
    const data = await response.json() as { error?: string }; setSaving(false);
    setMessage(response.ok ? "✓ Үнэ амжилттай шинэчлэгдлээ." : data.error ?? "Хадгалж чадсангүй.");
  }
  return <form className="admin-pricing" onSubmit={save}><div className="admin-toolbar"><div><p className="section-kicker">ТӨЛБӨРИЙН ТОХИРГОО</p><h1>Үнэ ба хугацаа</h1><p>Бүх багц болон 72 цагийн түрээсийн үндсэн үнийг эндээс удирдана.</p></div><button className="primary-button" disabled={saving}>{saving ? "Хадгалж байна…" : "Үнэ хадгалах"}</button></div><div className="pricing-grid">{(Object.keys(labels) as (keyof PricingSettings)[]).map((key) => <label key={key}>{labels[key]}<input type="number" min="1" step={key.endsWith("Hours") || key.endsWith("Days") ? 1 : 100} value={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: Number(event.target.value) }))} /><small>{key.endsWith("Hours") ? "цаг" : key.endsWith("Days") ? "хоног" : "₮"}</small></label>)}</div>{message && <p className="pricing-message">{message}</p>}</form>;
}
