import { apiAdmin } from "@/lib/admin";
import { abortMultipart, beginMultipart, deleteR2Object, enforceR2HardLimit, ensureR2StorageCapacity, finishMultipart, objectExists, R2StorageLimitError, signPart } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { ensureCanonicalSeries } from "@/lib/series-admin";

export const runtime = "nodejs";
const allowed = new Map([["video/mp4", "mp4"], ["application/x-mpegurl", "m3u8"], ["application/vnd.apple.mpegurl", "m3u8"], ["video/mp2t", "ts"], ["video/mpeg", "ts"]]);
const validKey = (key: string) => /^movies\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp4|m3u8|ts)$/i.test(key);
function videoType(filename: string, suppliedType: string) {
  const extension = filename.toLowerCase().match(/\.(mp4|m3u8|ts)$/)?.[1];
  if (extension === "ts") return { ext: "ts", mimeType: "video/mp2t" };
  if (extension === "m3u8") return { ext: "m3u8", mimeType: "application/vnd.apple.mpegurl" };
  if (extension === "mp4") return { ext: "mp4", mimeType: "video/mp4" };
  const ext = allowed.get(suppliedType);
  return ext ? { ext, mimeType: ext === "ts" ? "video/mp2t" : suppliedType } : undefined;
}
const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 70) || "movie";

export async function POST(request: Request) {
  const user = await apiAdmin();
  if (!user) return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const db = createSupabaseAdminClient();
  if (body.action === "init") {
    const filename = String(body.filename || "");
    const suppliedType = String(body.mimeType || body.contentType || "").toLowerCase();
    const fileSize = Number(body.fileSize);
    const detected = videoType(filename, suppliedType);
    if (!detected || !Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > 100 * 1024 ** 3) return Response.json({ error: "Зөвхөн 100GB хүртэл MP4, TS эсвэл HLS видео зөвшөөрнө." }, { status: 400 });
    try { await ensureR2StorageCapacity(fileSize); }
    catch (error) { if (error instanceof R2StorageLimitError) return Response.json({ error: error.message }, { status: 507 }); throw error; }
    const { ext, mimeType } = detected;
    const movieId = crypto.randomUUID(), key = `movies/${movieId}/${crypto.randomUUID()}.${ext}`;
    const uploadId = await beginMultipart(key, mimeType);
    const { error: orphanError } = await db.from("orphan_uploads").insert({ object_key: key, owner_id: user.id, upload_id: uploadId });
    if (orphanError) {
      await abortMultipart(key, uploadId).catch(() => undefined);
      return Response.json({ error: "Upload бүртгэл үүсгэж чадсангүй: " + orphanError.message }, { status: 500 });
    }
    return Response.json({ key, uploadId, chunkSize: 32 * 1024 * 1024 });
  }
  const key = String(body.key ?? ""), uploadId = String(body.uploadId ?? "");
  if (!validKey(key) || !uploadId) return Response.json({ error: "Upload мэдээлэл буруу." }, { status: 400 });
  const { data: orphan } = await db.from("orphan_uploads").select("owner_id,upload_id").eq("object_key", key).maybeSingle();
  if (!orphan || orphan.owner_id !== user.id || orphan.upload_id !== uploadId) return Response.json({ error: "Upload эрх таарахгүй." }, { status: 403 });
  if (body.action === "sign-part") {
    const partNumber = Number(body.partNumber);
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000) return Response.json({ error: "Part дугаар буруу." }, { status: 400 });
    return Response.json({ uploadUrl: await signPart(key, uploadId, partNumber) });
  }
  if (body.action === "abort") { await abortMultipart(key, uploadId); await db.from("orphan_uploads").delete().eq("object_key", key); return Response.json({ aborted: true }); }
  if (body.action === "complete") {
    const parts = Array.isArray(body.parts) ? body.parts.map((value) => { const p = value as Record<string, unknown>; return { ETag: String(p.etag || p.ETag), PartNumber: Number(p.partNumber || p.PartNumber) }; }) : [];
    if (!parts.length || parts.some((p) => !p.ETag || !Number.isInteger(p.PartNumber))) return Response.json({ error: "Upload хэсгүүд дутуу." }, { status: 400 });
    try {
      await finishMultipart(key, uploadId, parts);
    } catch (error) {
      console.error("R2 multipart complete failed", { key, error });
      return Response.json({ error: "R2 файл нэгтгэхэд алдаа гарлаа. Дахин оролдоно уу." }, { status: 502 });
    }
    if (!(await objectExists(key))) return Response.json({ error: "R2 файл баталгаажаагүй." }, { status: 502 });
    try { await enforceR2HardLimit(key); }
    catch (error) {
      await db.from("orphan_uploads").delete().eq("object_key", key);
      if (error instanceof R2StorageLimitError) return Response.json({ error: error.message }, { status: 507 });
      throw error;
    }
    const movie = (body.movie ?? {}) as { title?: string; synopsis?: string; categories?: string[]; filename?: string; contentType?: string; bytes?: number; releaseYear?: number; duration?: string; rating?: number; ageRating?: string; featured?: boolean; kind?: string; seriesId?: string; seasonId?: string; seasonNumber?: number; episodeNumber?: number };
    if (!movie.title?.trim() || !movie.synopsis?.trim() || !Array.isArray(movie.categories) || !movie.categories.length) { await deleteR2Object(key); await db.from("orphan_uploads").delete().eq("object_key", key); return Response.json({ error: "Киноны мэдээлэл дутуу." }, { status: 400 }); }
    if (movie.kind === "series" && movie.seriesId) {
      try {
        await ensureCanonicalSeries(movie.seriesId, movie.seasonId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Цувралын бүртгэл синк хийхэд алдаа гарлаа.";
        console.error("Series synchronization failed; R2 object retained", { key, error });
        return Response.json({ error: `${message} Видео R2 дээр хадгалагдсан.` }, { status: 500 });
      }
    }
    let slug = slugify(movie.title); const collision = await db.from("movies").select("id").eq("slug", slug).maybeSingle(); if (collision.data) slug += `-${crypto.randomUUID().slice(0, 8)}`;
    const normalizedType = key.toLowerCase().endsWith(".ts") ? "video/mp2t" : key.toLowerCase().endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp4";
    const payload = { title: movie.title.trim(), slug, description: movie.synopsis.trim(), video_key: key, original_filename: movie.filename, content_type: normalizedType, bytes: Number(movie.bytes), release_year: Number(movie.releaseYear) || new Date().getFullYear(), duration: movie.duration || null, rating: Number(movie.rating) || 0, age_rating: movie.ageRating || "13+", featured: Boolean(movie.featured), status: "published", kind: movie.kind === "series" ? "series" : "movie", series_id: movie.seriesId || null, season_id: movie.seasonId || null, season_number: movie.seasonNumber || null, episode_number: movie.episodeNumber || null, created_by: user.id === "admin-password" ? null : user.id };
    let record: { id: string; slug: string; status: string; video_key: string } | null = null;
    let insertError: { message: string; code?: string } | null = null;
    for (let attempt = 0; attempt < 3 && !record; attempt += 1) {
      const result = await db.from("movies").insert(payload).select("id,slug,status,video_key").single();
      record = result.data;
      insertError = result.error;
      if (insertError && attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
    if (!record || insertError) {
      console.error("Supabase movie insert failed; R2 object retained", { key, error: insertError });
      return Response.json({ error: "Киноны бүртгэл хадгалагдсангүй. Видео R2 дээр хадгалагдсан: " + (insertError?.message ?? "Тодорхойгүй алдаа") }, { status: 500 });
    }
    const { data: genres } = await db.from("genres").select("id,name").in("name", movie.categories);
    if (genres?.length) await db.from("movie_genres").insert(genres.map((g) => ({ movie_id: record.id, genre_id: g.id })));
    await db.from("orphan_uploads").delete().eq("object_key", key);
    return Response.json({ id: record.id, slug: record.slug, status: record.status, videoKey: record.video_key });
  }
  return Response.json({ error: "Тодорхойгүй үйлдэл." }, { status: 400 });
}
