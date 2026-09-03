"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Status = { deviceLimit: number | null; unlimitedDevices?: boolean; registeredDeviceCount: number; canRegisterDevice: boolean; currentRegistered: boolean; currentDeviceId?: string; suggestedName: string };

async function deviceFingerprint() {
  const shortAgent = /iPhone|iPad/.test(navigator.userAgent) ? "ios" : /Android/.test(navigator.userAgent) ? "android" : /Windows/.test(navigator.userAgent) ? "windows" : /Macintosh/.test(navigator.userAgent) ? "mac" : "other";
  const browser = /Edg\//.test(navigator.userAgent) ? "edge" : /OPR\//.test(navigator.userAgent) ? "opera" : /CriOS|Chrome\//.test(navigator.userAgent) ? "chrome" : /Firefox\//.test(navigator.userAgent) ? "firefox" : /Safari\//.test(navigator.userAgent) ? "safari" : "browser";
  const size = [screen.width, screen.height].sort((a,b) => a-b).join("x");
  const source = [shortAgent,browser,navigator.platform,size,devicePixelRatio,navigator.maxTouchPoints,navigator.hardwareConcurrency,Intl.DateTimeFormat().resolvedOptions().timeZone].join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2,"0")).join("");
}

export function DeviceGate() {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status>();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const savedId = localStorage.getItem("khuree-device-id") ?? "";
    void deviceFingerprint().then(async (fingerprint) => {
    const query = new URLSearchParams({ ...(savedId ? { deviceId:savedId } : {}), fingerprint }).toString();
    return fetch(`/api/account/devices?${query}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const next = await response.json() as Status & { currentDeviceId?: string };
        window.dispatchEvent(new Event("khuree-authenticated"));
        if (next.currentDeviceId) localStorage.setItem("khuree-device-id", next.currentDeviceId);
        setStatus(next);
        if (next.currentRegistered && next.currentDeviceId) void fetch("/api/account/devices", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({deviceId:next.currentDeviceId,name:next.suggestedName,fingerprint}) });
      })
      .catch(() => undefined);
    }).catch(() => undefined);
  }, []);
  // Browsing and switching sections must remain available even when a device
  // still needs registration. Playback routes enforce device access server-side.
  if (pathname === "/live" || !status || status.currentRegistered) return null;
  const limitReached = !status.canRegisterDevice;
  async function register() {
    setSaving(true);
    const deviceId = localStorage.getItem("khuree-device-id") || crypto.randomUUID();
    localStorage.setItem("khuree-device-id", deviceId);
    const fingerprint = await deviceFingerprint();
    const response = await fetch("/api/account/devices", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ deviceId, name: status?.suggestedName, fingerprint }) });
    const data = await response.json() as { currentDeviceId?: string; registeredDeviceCount?: number };
    setSaving(false);
    if (response.ok) { if (data.currentDeviceId) localStorage.setItem("khuree-device-id",data.currentDeviceId); setStatus((current) => current ? { ...current, currentRegistered: true, currentDeviceId:data.currentDeviceId, registeredDeviceCount:data.registeredDeviceCount ?? current.registeredDeviceCount } : current); }
  }
  return <div className="device-modal-backdrop"><section className="device-modal"><i>▣</i><p className="section-kicker">ТӨХӨӨРӨМЖИЙН ХЯЗГААР</p><h2>{limitReached ? "Төхөөрөмжийн хязгаар хүрсэн" : "Энэ төхөөрөмжийг бүртгүүлэх үү?"}</h2><p>{limitReached ? "Энэ эрх дээр 3 төхөөрөмж аль хэдийн бүртгэгдсэн байна. Шинэ төхөөрөмж ашиглахын тулд бүртгэлтэй төхөөрөмжүүдийн аль нэгийг хасна уу. Эрхээ бусдад дамжуулах болон хуваалцах боломжгүйг анхаарна уу." : status.unlimitedDevices ? "Энэ developer бүртгэл төхөөрөмжийн хязгааргүй эрхтэй. Одоогийн төхөөрөмжөө бүртгэн үргэлжлүүлнэ үү." : "Таны эрх дээр хамгийн ихдээ 3 төхөөрөмж бүртгүүлэх боломжтой. Бүртгүүлсэн төхөөрөмжөө бусдад дамжуулахгүй байхыг анхаарна уу."}</p><div className="device-summary"><b>{status.suggestedName}</b><span>{status.unlimitedDevices ? `${status.registeredDeviceCount} төхөөрөмж · Хязгааргүй` : `${status.registeredDeviceCount} / ${status.deviceLimit} төхөөрөмж бүртгэлтэй`}</span></div><div className="device-modal-actions">{limitReached ? <a className="primary-button" href="/account#devices">Төхөөрөмжүүдээ удирдах</a> : <button className="primary-button" disabled={saving} onClick={() => void register()}>{saving ? "Бүртгэж байна…" : "Төхөөрөмж бүртгүүлэх"}</button>}<button onClick={() => history.back()}>{limitReached ? "Буцах" : "Болих"}</button></div></section></div>;
}
