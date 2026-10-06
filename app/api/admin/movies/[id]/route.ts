import { apiAdmin } from "@/lib/admin";
import { deleteR2Object, deleteR2Prefixes } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await apiAdmin())) return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 403 });
  const { id } = await params; if (!uuid.test(id)) return Response.json({ error: "ID буруу." }, { status: 400 });
  const body = await request.json() as { title?: string; synopsis?: string; categories?: unknown[]; ageRating?: string; seasonNumber?: number; episodeNumber?: number; verticalSegmentMinutes?: number; isFree?: boolean; rentalPrice?: number };
  if (!body.title?.trim() || !body.synopsis?.trim() || !Array.isArray(body.categories) || !body.categories.length) return Response.json({ error: "Мэдээлэл дутуу." }, { status: 400 });
  const db = createSupabaseAdminClient();
  const updates: Record<string, unknown> = { title: body.title.trim(), description: body.synopsis.trim(), age_rating: body.ageRating || "13+", is_free: Boolean(body.isFree), rental_price: body.rentalPrice && body.rentalPrice > 0 ? Math.trunc(body.rentalPrice) : null, updated_at: new Date().toISOString(), season_number: body.seasonNumber || null, episode_number: body.episodeNumber || null };
  if (body.verticalSegmentMinutes) updates.duration = `${body.verticalSegmentMinutes === 5 ? 5 : 3} минутын хэсэг`;
  const { data: movie, error } = await db.from("movies").update(updates).eq("id", id).select("*").maybeSingle();
  if (error || !movie) return Response.json({ error: error?.message ?? "Кино олдсонгүй." }, { status: error ? 500 : 404 });
  const { data: genres } = await db.from("genres").select("id").in("name", body.categories); await db.from("movie_genres").delete().eq("movie_id", id); if (genres?.length) await db.from("movie_genres").insert(genres.map(g => ({ movie_id: id, genre_id: g.id })));
  return Response.json({ movie });
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await apiAdmin())) return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 403 });
  const { id } = await params; if (!uuid.test(id)) return Response.json({ error: "ID буруу." }, { status: 400 });
  const db = createSupabaseAdminClient(); const { data: movie } = await db.from("movies").select("video_key").eq("id", id).maybeSingle(); if (!movie) return Response.json({ error: "Кино олдсонгүй." }, { status: 404 });
  let r2ObjectsDeleted = 0;
  try {
    r2ObjectsDeleted = await deleteR2Prefixes([`movies/${id}/`, `posters/${id}/`, `backdrops/${id}/`, `subtitles/${id}/`]);
    if (movie.video_key && !movie.video_key.startsWith(`movies/${id}/`) && /^movies\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp4|m3u8|ts)$/i.test(movie.video_key)) {
      await deleteR2Object(movie.video_key);
      r2ObjectsDeleted += 1;
    }
  } catch {
    return Response.json({ error: "Киноны R2 folder-ийг бүрэн устгаж чадсангүй. Database дахь кино устгагдаагүй." }, { status: 502 });
  }
  const { error } = await db.from("movies").delete().eq("id", id); if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ deleted: true, id, r2ObjectsDeleted });
}
