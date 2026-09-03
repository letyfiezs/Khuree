"use client";
import { useEffect, useState } from "react";
import type { RegisteredDevice } from "@/lib/auth/local-auth";

type DeviceStatus = { deviceLimit: number | null; unlimitedDevices?: boolean; registeredDeviceCount: number; currentDeviceId?: string; devices: RegisteredDevice[] };
const relative = (value: string) => {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return "Өнөөдөр";
  if (days === 1) return "Өчигдөр";
  return `${days} хоногийн өмнө`;
};
export function MyDevices() {
  const [status, setStatus] = useState<DeviceStatus>();
  const [remove, setRemove] = useState<RegisteredDevice>();
  const [error, setError] = useState("");
  useEffect(() => { void fetch("/api/account/devices", { cache: "no-store" }).then(async (response) => response.ok && setStatus(await response.json())); }, []);
  async function confirmRemove() {
    if (!remove) return;
    const response = await fetch(`/api/account/devices?id=${encodeURIComponent(remove.id)}`, { method: "DELETE" });
    const data = await response.json() as { devices?: RegisteredDevice[]; error?: string };
    if (!response.ok) return setError(data.error ?? "Төхөөрөмж хасаж чадсангүй.");
    setStatus((current) => current ? { ...current, devices: data.devices ?? [], registeredDeviceCount: data.devices?.length ?? 0 } : current);
    setRemove(undefined);
  }
  return <section className="devices-panel" id="devices"><div className="devices-heading"><div><p className="section-kicker">DEVICE SECURITY</p><h2>Миний төхөөрөмжүүд</h2></div><b>{status?.unlimitedDevices ? `${status.registeredDeviceCount} · ∞` : `${status?.registeredDeviceCount ?? "—"} / ${status?.deviceLimit ?? 3}`}</b></div><p>{status?.unlimitedDevices ? "Developer бүртгэл: төхөөрөмжийн тоо хязгааргүй." : <>Нэг эрхээр хамгийн ихдээ <strong>3 төхөөрөмж</strong> бүртгүүлэх боломжтой.</>}</p><div className="device-list">{status?.devices.map((device) => <article key={device.id}><i>▣</i><div><b>{device.name}</b>{device.id === status.currentDeviceId && <em>Одоогийн төхөөрөмж</em>}<small>Сүүлд ашигласан: {relative(device.lastSeenAt)}</small></div><button onClick={() => setRemove(device)}>Төхөөрөмж хасах</button></article>)}</div>{error && <p className="form-error">⚠ {error}</p>}<aside><b>Анхааруулга</b><span>Таны Khuree эрх хувийн хэрэглээнд зориулагдсан. Нэг эрхийг олон хүнтэй хуваалцах, бусдад дамжуулах нь үйлчилгээний нөхцөлийг зөрчиж болзошгүй. Сэжигтэй олон төхөөрөмжийн хэрэглээ илэрсэн тохиолдолд эрхийг түр хугацаанд хязгаарлаж болно.</span></aside>{remove && <div className="device-modal-backdrop"><section className="device-modal"><p className="section-kicker">БАТАЛГААЖУУЛАХ</p><h2>Төхөөрөмж хасах уу?</h2><p>Энэ төхөөрөмжийг таны эрхээс салгах гэж байна. Хассаны дараа тухайн төхөөрөмж дээрх Khuree эрх хүчингүй болно.</p><div className="device-summary"><b>{remove.name}</b></div><div className="device-modal-actions"><button className="primary-button" onClick={() => void confirmRemove()}>Хасах</button><button onClick={() => setRemove(undefined)}>Болих</button></div></section></div>}</section>;
}
