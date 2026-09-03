import { cookies, headers } from "next/headers";
import { getCurrentUser, type RegisteredDevice } from "@/lib/auth/local-auth";
import { createSupabaseAdminClient } from "@/lib/supabase";

const cookieName = "khuree-device-id";
const deviceName = (agent: string) => {
  const browser = /Edg\//.test(agent) ? "Edge" : /OPR\//.test(agent) ? "Opera" : /CriOS|Chrome\//.test(agent) ? "Chrome" : /Firefox\//.test(agent) ? "Firefox" : /Safari\//.test(agent) ? "Safari" : "Browser";
  const system = /iPhone/.test(agent) ? "iPhone" : /iPad/.test(agent) ? "iPad" : /Android/.test(agent) ? "Android" : /Windows/.test(agent) ? "Windows" : /Macintosh/.test(agent) ? "Mac" : "Төхөөрөмж";
  return `${browser} • ${system}`;
};

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  const store = await cookies();
  let currentId = store.get(cookieName)?.value;
  if (currentId && !user.devices.some((device) => device.id === currentId)) currentId = undefined;
  const savedId = new URL(request.url).searchParams.get("deviceId");
  const fingerprint = new URL(request.url).searchParams.get("fingerprint");
  const fingerprintDevice = fingerprint ? user.devices.find((device) => device.fingerprint === fingerprint) : undefined;
  if ((!currentId || !user.devices.some((device) => device.id === currentId)) && fingerprintDevice) currentId = fingerprintDevice.id;
  if (!currentId && savedId && /^[0-9a-f-]{36}$/i.test(savedId) && user.devices.some((device) => device.id === savedId)) {
    currentId = savedId;
    store.set(cookieName, savedId, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return Response.json({ deviceLimit: user.deviceLimit, unlimitedDevices: user.deviceLimit === null, registeredDeviceCount: user.devices.length, canRegisterDevice: user.deviceLimit === null || user.devices.length < user.deviceLimit, currentDeviceId: currentId, currentRegistered: Boolean(currentId && user.devices.some((device) => device.id === currentId)), suggestedName: deviceName((await headers()).get("user-agent") ?? ""), devices: user.devices });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  const body = await request.json() as { deviceId?: string; name?: string; fingerprint?: string };
  if (!body.deviceId || !/^[0-9a-f-]{36}$/i.test(body.deviceId)) return Response.json({ error: "Төхөөрөмжийн мэдээлэл буруу." }, { status: 400 });
  const client = createSupabaseAdminClient();
  const { data, error } = await client.auth.admin.getUserById(user.id);
  if (error || !data.user) return Response.json({ error: "Хэрэглэгч олдсонгүй." }, { status: 404 });
  const devices = Array.isArray(data.user.app_metadata?.devices) ? data.user.app_metadata.devices as RegisteredDevice[] : [];
  const deviceLimit = data.user.app_metadata?.unlimited_devices === true ? null : 3;
  const fingerprint = typeof body.fingerprint === "string" && /^[0-9a-f]{64}$/.test(body.fingerprint) ? body.fingerprint : undefined;
  const existing = devices.find((device) => device.id === body.deviceId) ?? (fingerprint ? devices.find((device) => device.fingerprint === fingerprint) : undefined);
  if (!existing && deviceLimit !== null && devices.length >= deviceLimit) return Response.json({ error: "Төхөөрөмжийн хязгаар хүрсэн.", limitReached: true, registeredDeviceCount: devices.length }, { status: 409 });
  const now = new Date().toISOString();
  const next = existing ? devices.map((device) => device.id === existing.id ? { ...device, name:body.name?.trim().slice(0,80)||device.name, fingerprint:fingerprint||device.fingerprint, lastSeenAt: now } : device) : [...devices, { id: body.deviceId, name: body.name?.trim().slice(0, 80) || deviceName((await headers()).get("user-agent") ?? ""), fingerprint, createdAt: now, lastSeenAt: now }];
  const updated = await client.auth.admin.updateUserById(user.id, { app_metadata: { ...data.user.app_metadata, devices: next } });
  if (updated.error) return Response.json({ error: updated.error.message }, { status: 500 });
  (await cookies()).set(cookieName, existing?.id ?? body.deviceId, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return Response.json({ ok: true, devices: next, currentDeviceId: existing?.id ?? body.deviceId, registeredDeviceCount: next.length });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Төхөөрөмж олдсонгүй." }, { status: 400 });
  const client = createSupabaseAdminClient();
  const { data, error } = await client.auth.admin.getUserById(user.id);
  if (error || !data.user) return Response.json({ error: "Хэрэглэгч олдсонгүй." }, { status: 404 });
  const devices = Array.isArray(data.user.app_metadata?.devices) ? data.user.app_metadata.devices as RegisteredDevice[] : [];
  const next = devices.filter((device) => device.id !== id);
  const updated = await client.auth.admin.updateUserById(user.id, { app_metadata: { ...data.user.app_metadata, devices: next } });
  if (updated.error) return Response.json({ error: updated.error.message }, { status: 500 });
  if ((await cookies()).get(cookieName)?.value === id) (await cookies()).delete(cookieName);
  return Response.json({ ok: true, devices: next });
}
