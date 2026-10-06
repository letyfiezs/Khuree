import { apiAdmin } from "@/lib/admin";
import { abortMultipart, beginMultipart, deleteR2Object, ensureR2StorageCapacity, finishMultipart, recordCompletedR2Upload, R2StorageLimitError, signPart } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const keyPattern = /^trailers\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.mp4$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiAdmin();
  if (!user) return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 403 });
  const { id } = await params;
  if (!uuid.test(id)) return Response.json({ error: "Киноны ID буруу." }, { status: 400 });
  const body = await request.json() as Record<string, unknown>;
  const db = createSupabaseAdminClient();

  if (body.action === "init") {
    const filename = String(body.filename ?? "").toLowerCase();
    const fileSize = Number(body.fileSize);
    if (!filename.endsWith(".mp4") || !Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > 10 * 1024 ** 3) return Response.json({ error: "Trailer нь 10GB хүртэл H.264 MP4 файл байна." }, { status: 400 });
    const { data: movie } = await db.from("movies").select("id").eq("id", id).maybeSingle();
    if (!movie) return Response.json({ error: "Кино олдсонгүй." }, { status: 404 });
    try { await ensureR2StorageCapacity(fileSize); }
    catch (error) { if (error instanceof R2StorageLimitError) return Response.json({ error: error.message }, { status: 507 }); throw error; }
    const key = `trailers/${id}/${crypto.randomUUID()}.mp4`;
    const uploadId = await beginMultipart(key, "video/mp4");
    const { error } = await db.from("orphan_uploads").insert({ object_key: key, owner_id: user.id, upload_id: uploadId });
    if (error) { await abortMultipart(key, uploadId).catch(() => undefined); return Response.json({ error: error.message }, { status: 500 }); }
    return Response.json({ key, uploadId, chunkSize: 16 * 1024 * 1024 });
  }

  const key = String(body.key ?? ""), uploadId = String(body.uploadId ?? "");
  if (!keyPattern.test(key) || !key.startsWith(`trailers/${id}/`) || !uploadId) return Response.json({ error: "Trailer upload мэдээлэл буруу." }, { status: 400 });
  const { data: orphan } = await db.from("orphan_uploads").select("owner_id,upload_id").eq("object_key", key).maybeSingle();
  if (!orphan || orphan.owner_id !== user.id || orphan.upload_id !== uploadId) return Response.json({ error: "Upload эрх таарахгүй." }, { status: 403 });
  if (body.action === "sign-part") {
    const partNumber = Number(body.partNumber);
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000) return Response.json({ error: "Part дугаар буруу." }, { status: 400 });
    return Response.json({ uploadUrl: await signPart(key, uploadId, partNumber) });
  }
  if (body.action === "abort") {
    await abortMultipart(key, uploadId); await db.from("orphan_uploads").delete().eq("object_key", key);
    return Response.json({ aborted: true });
  }
  if (body.action === "complete") {
    const durationMinutes = Number(body.durationMinutes);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 10) return Response.json({ error: "Trailer-ийн хугацаа 5–10 минут байна." }, { status: 400 });
    const parts = Array.isArray(body.parts) ? body.parts.map((value) => { const part = value as Record<string, unknown>; return { ETag: String(part.etag ?? part.ETag), PartNumber: Number(part.partNumber ?? part.PartNumber) }; }) : [];
    if (!parts.length || parts.some((part) => !part.ETag || !Number.isInteger(part.PartNumber))) return Response.json({ error: "Upload хэсгүүд дутуу." }, { status: 400 });
    await finishMultipart(key, uploadId, parts);
    const { data: current } = await db.from("movies").select("trailer_key").eq("id", id).maybeSingle();
    const { error } = await db.from("movies").update({ trailer_key: key, trailer_duration_seconds: durationMinutes * 60, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return Response.json({ error: `Trailer R2 дээр хадгалагдсан ч кинонд холбож чадсангүй: ${error.message}` }, { status: 500 });
    await db.from("orphan_uploads").delete().eq("object_key", key);
    if (current?.trailer_key && current.trailer_key !== key) await deleteR2Object(current.trailer_key).catch(() => undefined);
    recordCompletedR2Upload(Number(body.fileSize));
    return Response.json({ trailerKey: key, trailerDurationSeconds: durationMinutes * 60 });
  }
  return Response.json({ error: "Тодорхойгүй үйлдэл." }, { status: 400 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await apiAdmin())) return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 403 });
  const { id } = await params;
  if (!uuid.test(id)) return Response.json({ error: "Киноны ID буруу." }, { status: 400 });
  const db = createSupabaseAdminClient();
  const { data } = await db.from("movies").select("trailer_key").eq("id", id).maybeSingle();
  if (data?.trailer_key) await deleteR2Object(data.trailer_key);
  const { error } = await db.from("movies").update({ trailer_key: null, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ deleted: true });
}
