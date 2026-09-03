import { apiAdmin } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { setUserEntitlement } from "@/lib/user-entitlements";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await apiAdmin())) return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 403 });
  const { id } = await params;
  if (!uuid.test(id)) return Response.json({ error: "Хэрэглэгчийн ID буруу." }, { status: 400 });
  const body = await request.json() as { action?: unknown; days?: unknown; permission?: unknown; allowed?: unknown; deviceId?: unknown };
  if (body.action === "grant" || body.action === "revoke") {
    const days = Number(body.days);
    if (body.action === "grant" && (!Number.isInteger(days) || days < 1 || days > 3650)) return Response.json({ error: "Эрхийн хоног 1–3650 байна." }, { status: 400 });
    try { const entitlement = await setUserEntitlement(id, { enabled: body.action === "grant", days: body.action === "grant" ? days : undefined, source: "manual" }); return Response.json({ id, entitlement }); }
    catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Эрх шинэчилж чадсангүй." }, { status: 500 }); }
  }
  if (body.action === "remove_device") {
    if (typeof body.deviceId !== "string" || !body.deviceId) return Response.json({ error: "Төхөөрөмжийн ID дутуу." }, { status: 400 });
    const client = createSupabaseAdminClient();
    const { data: current, error: getError } = await client.auth.admin.getUserById(id);
    if (getError || !current.user) return Response.json({ error: "Хэрэглэгч олдсонгүй." }, { status: 404 });
    const devices = Array.isArray(current.user.app_metadata?.devices) ? current.user.app_metadata.devices as { id: string }[] : [];
    const next = devices.filter((device) => device.id !== body.deviceId);
    if (next.length === devices.length) return Response.json({ error: "Төхөөрөмж олдсонгүй." }, { status: 404 });
    const updated = await client.auth.admin.updateUserById(id, { app_metadata: { ...current.user.app_metadata, devices: next } });
    if (updated.error) return Response.json({ error: updated.error.message }, { status: 500 });
    return Response.json({ id, devices: next });
  }
  if (!(["movie", "series", "vertical", "adult"] as unknown[]).includes(body.permission) || typeof body.allowed !== "boolean") return Response.json({ error: "Үзэх эрхийн утга буруу." }, { status: 400 });
  const client = createSupabaseAdminClient();
  const { data: profile } = await client.from("profiles").select("role").eq("id", id).maybeSingle();
  if (profile?.role === "admin") return Response.json({ error: "Админы үзэх эрхийг хаах боломжгүй." }, { status: 400 });
  const { data: current, error: getError } = await client.auth.admin.getUserById(id);
  if (getError || !current.user) return Response.json({ error: "Хэрэглэгч олдсонгүй." }, { status: 404 });
  const permissions = current.user.app_metadata?.watch_permissions && typeof current.user.app_metadata.watch_permissions === "object" ? current.user.app_metadata.watch_permissions : {};
  const { error } = await client.auth.admin.updateUserById(id, { app_metadata: { ...current.user.app_metadata, watch_permissions: { ...permissions, [body.permission as string]: body.allowed } } });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id, permission: body.permission, allowed: body.allowed });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await apiAdmin())) return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 403 });
  const { id } = await params;
  if (!uuid.test(id)) return Response.json({ error: "Хэрэглэгчийн ID буруу." }, { status: 400 });
  const client = createSupabaseAdminClient();
  const { data: profile } = await client.from("profiles").select("role").eq("id", id).maybeSingle();
  if (profile?.role === "admin") return Response.json({ error: "Админ бүртгэлийг устгах боломжгүй." }, { status: 400 });
  const { data: current, error: getError } = await client.auth.admin.getUserById(id);
  if (getError || !current.user) return Response.json({ error: "Хэрэглэгч олдсонгүй." }, { status: 404 });
  const { error } = await client.auth.admin.deleteUser(id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ deleted: true, id });
}
