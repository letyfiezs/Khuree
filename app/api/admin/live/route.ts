import { apiAdmin } from "@/lib/admin";
import { liveChannels } from "@/lib/live-channels";
import { deleteR2Object, signedR2DownloadUrl } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const fields = "id,channel_id,channel_name,title,scheduled_at,duration_minutes,ends_at,status,object_key,bytes,started_at,finished_at,error_message,worker_id,created_at";
const cleanFilename = (title: string) => `${title.replace(/[\\/:*?\"<>|]+/g, "-").slice(0, 90) || "live-recording"}.mp4`;

export async function GET() {
  if (!(await apiAdmin())) return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 401 });
  const { data, error } = await createSupabaseAdminClient().from("live_recordings").select(fields).order("scheduled_at", { ascending: false }).limit(200);
  if (error) return Response.json({ channels: liveChannels, recordings: [], setupRequired: error.code === "42P01", error: error.message }, { status: error.code === "42P01" ? 503 : 500 });
  return Response.json({ channels: liveChannels, recordings: data ?? [] });
}

export async function POST(request: Request) {
  const user = await apiAdmin();
  if (!user) return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 401 });
  const body = await request.json() as { action?: string; channelId?: string; recordingId?: string; minutes?: number; scheduledAt?: string; endsAt?: string; title?: string };
  const db = createSupabaseAdminClient();
  if (body.action === "schedule" || body.action === "start") {
    const channel = liveChannels.find((item) => item.id === body.channelId);
    if (!channel) return Response.json({ error: "Суваг олдсонгүй." }, { status: 400 });
    const hasDuration = body.minutes !== undefined && body.minutes !== null && String(body.minutes).trim() !== "";
    const duration = hasDuration ? Math.min(720, Math.max(1, Math.round(Number(body.minutes)))) : null;
    const scheduledAt = body.action === "start" ? new Date() : new Date(String(body.scheduledAt));
    if (Number.isNaN(scheduledAt.getTime())) return Response.json({ error: "Эхлэх цаг буруу байна." }, { status: 400 });
    const endsAt = body.endsAt ? new Date(body.endsAt) : null;
    if (!duration && (!endsAt || Number.isNaN(endsAt.getTime()) || endsAt <= scheduledAt)) return Response.json({ error: "Үргэлжлэх минут эсвэл дуусах огноо/цагийн аль нэгийг оруулна уу." }, { status: 400 });
    if (duration && duration < 1) return Response.json({ error: "Үргэлжлэх хугацаа 1 минутаас дээш байна." }, { status: 400 });
    const title = body.title?.trim() || `${channel.name} · ${scheduledAt.toLocaleString("mn-MN", { timeZone: "Asia/Ulaanbaatar" })}`;
    const { data, error } = await db.from("live_recordings").insert({ channel_id: channel.id, channel_name: channel.name,
      stream_url: channel.streamUrl, title, scheduled_at: scheduledAt.toISOString(), duration_minutes: duration, ends_at: endsAt?.toISOString() ?? null,
      created_by: user.id === "admin-password" ? null : user.id }).select(fields).single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ recording: data });
  }
  if (!body.recordingId) return Response.json({ error: "Бичлэгийн ID дутуу." }, { status: 400 });
  const result = await db.from("live_recordings").select(fields).eq("id", body.recordingId).maybeSingle();
  const record = result.data;
  if (result.error || !record) return Response.json({ error: "Бичлэг олдсонгүй." }, { status: 404 });
  if (body.action === "cancel") {
    if (record.status !== "scheduled") return Response.json({ error: "Зөвхөн хүлээгдэж буй хуваарийг цуцална." }, { status: 409 });
    await db.from("live_recordings").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", record.id);
    return Response.json({ ok: true });
  }
  if (body.action === "stop") {
    if (record.status !== "recording") return Response.json({ error: "Зөвхөн яг одоо бичиж буй бичлэгийг зогсооно." }, { status: 409 });
    if (!record.worker_id?.endsWith("-stop-v1")) return Response.json({ error: "Энэ бичлэг хуучин recorder-аар эхэлсэн тул дундаас нь аюулгүй зогсоох боломжгүй. Одоогийн бичлэг дууссаны дараах шинэ бичлэгүүд дээр ажиллана." }, { status: 409 });
    const stopped = await db.from("live_recordings").update({ status: "cancelled", error_message: "__STOP_REQUESTED__", updated_at: new Date().toISOString() }).eq("id", record.id).eq("status", "recording");
    if (stopped.error) return Response.json({ error: stopped.error.message }, { status: 500 });
    return Response.json({ ok: true });
  }
  if (body.action === "download" || body.action === "preview") {
    if (!record.object_key) return Response.json({ error: "Бэлэн файл алга." }, { status: 409 });
    return Response.json({ url: await signedR2DownloadUrl(record.object_key, body.action === "download" ? cleanFilename(record.title) : undefined) });
  }
  if (body.action === "delete") {
    if (["recording", "uploading"].includes(record.status)) return Response.json({ error: "Бичиж/хуулж байгаа файлыг устгах боломжгүй." }, { status: 409 });
    if (record.object_key) await deleteR2Object(record.object_key);
    const deleted = await db.from("live_recordings").delete().eq("id", record.id);
    if (deleted.error) return Response.json({ error: deleted.error.message }, { status: 500 });
    return Response.json({ ok: true });
  }
  return Response.json({ error: "Тодорхойгүй үйлдэл." }, { status: 400 });
}
