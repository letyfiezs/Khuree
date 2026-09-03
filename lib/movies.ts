import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { publicR2Url } from "@/lib/r2";
import { audioLabels, type AudioLabel, type ContentItem } from "@/lib/content";

export type MovieRow = {
  id: string; slug: string; title: string; description: string; poster_url: string | null; backdrop_url: string | null;
  video_key: string | null; original_filename: string | null; content_type: string | null; bytes: number;
  release_year: number | null; duration: string | null; rating: number; age_rating: string; status: "draft" | "processing" | "published";
  featured: boolean; kind: "movie" | "series"; series_id: string | null; season_id: string | null; season_number: number | null; episode_number: number | null;
  created_at: string; genres?: { genres: { name: string } | null }[];
  subtitles?: { id: string; label: string; language: string; object_key: string; original_filename: string }[];
  backdrop_position_x?: number; backdrop_position_y?: number; backdrop_zoom?: number;
};
export function mapMovie(row: MovieRow): ContentItem {
  const genreNames = row.genres?.map((x) => x.genres?.name).filter((x): x is string => Boolean(x)) ?? [];
  const audioLabel = (genreNames.includes("Субтай") || genreNames.includes("Орчуулгатай") ? "Субтай" : genreNames.includes("Хэлтэй") ? "Хэлтэй" : undefined) as AudioLabel | undefined;
  return { id: row.id, slug: row.slug, title: row.title, synopsis: row.description, year: row.release_year ?? new Date(row.created_at).getFullYear(), duration: row.duration ?? "Шинэ", age: row.age_rating, rating: Number(row.rating), genre: genreNames.filter((name) => !audioLabels.includes(name as AudioLabel) && name !== "Орчуулгатай"), audioLabel, kind: row.kind, status: row.status, accent: "#7f1018", videoKey: row.video_key ?? undefined, videoBytes: row.bytes, subtitles: row.subtitles?.map(x=>({id:x.id,label:x.label,language:x.language,key:x.id,originalFilename:x.original_filename,sourceUrl:publicR2Url(x.object_key)})) ?? [], posterUrl: row.poster_url ?? undefined, backdropUrl: row.backdrop_url ?? undefined, featured: row.featured, backdropPositionX: row.backdrop_position_x ?? 50, backdropPositionY: row.backdrop_position_y ?? 50, backdropZoom: row.backdrop_zoom ?? 100, seriesId: row.series_id ?? undefined, seasonId: row.season_id ?? undefined, seasonNumber: row.season_number ?? undefined, episodeNumber: row.episode_number ?? undefined };
}
const selection = "*,genres:movie_genres(genres(name)),subtitles(id,label,language,object_key,original_filename)";
export const listMovies = cache(async function listMovies() {
  const { data, error } = await createSupabaseAdminClient().from("movies").select(selection).order("created_at", { ascending: false });
  if (error) throw error; return (data as unknown as MovieRow[]).map(mapMovie);
});
const listPublicMoviesCached = unstable_cache(
  async () => (await listMovies()).filter((item) => item.status === "published"),
  ["khuree-public-movies-v1"],
  { revalidate: 30, tags: ["catalog"] },
);
export const listPublicMovies = cache(listPublicMoviesCached);
export async function getMovieBySlug(slug: string) {
  let normalizedSlug = slug;
  try { normalizedSlug = decodeURIComponent(slug); } catch { /* Already decoded or malformed input. */ }
  normalizedSlug = normalizedSlug.normalize("NFC");
  const { data, error } = await createSupabaseAdminClient().from("movies").select(selection).eq("slug", normalizedSlug).maybeSingle();
  if (error) throw error; return data ? mapMovie(data as unknown as MovieRow) : undefined;
}
export async function getMovieRow(id: string) {
  const { data, error } = await createSupabaseAdminClient().from("movies").select("*").eq("id", id).maybeSingle();
  if (error) throw error; return data as MovieRow | null;
}
export function playbackUrl(videoKey?: string) { return videoKey ? publicR2Url(videoKey) : undefined; }
