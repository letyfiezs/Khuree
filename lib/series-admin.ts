import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase";
export type SeriesShow = { id: string; title: string; synopsis: string; categories: string[]; ageRating: string; createdAt: string; posterUrl?: string };
export type SeriesSeason = { id: string; seriesId: string; number: number; title: string };
type ShowRow = { id: string; title: string; synopsis: string; categories: string[]; age_rating: string; created_at: string };
type SeasonRow = { id: string; series_id: string; number: number; title: string };
const mapShow = (row: ShowRow, posterUrl?: string | null): SeriesShow => ({ id: row.id, title: row.title, synopsis: row.synopsis, categories: row.categories ?? [], ageRating: row.age_rating, createdAt: row.created_at, posterUrl: posterUrl ?? undefined });
const mapSeason = (row: SeasonRow): SeriesSeason => ({ id: row.id, seriesId: row.series_id, number: row.number, title: row.title });
export async function listSeriesShows() { const db=createSupabaseAdminClient(); const [{ data, error },{data:art}]=await Promise.all([db.from("series_shows").select("*").order("created_at",{ascending:false}),db.from("series").select("id,poster_url")]); if(error)throw error; const posters=new Map((art??[]).map(x=>[x.id,x.poster_url])); return (data as ShowRow[]).map(row=>mapShow(row,posters.get(row.id))); }
export async function getSeriesShow(id: string) { const db=createSupabaseAdminClient(); const [{data,error},{data:art}]=await Promise.all([db.from("series_shows").select("*").eq("id",id).maybeSingle(),db.from("series").select("poster_url").eq("id",id).maybeSingle()]); if(error)throw error; return data?mapShow(data as ShowRow,art?.poster_url):undefined; }
export async function createSeriesShow(input: { title: string; synopsis: string; categories: string[]; ageRating: string }) { const { data, error } = await createSupabaseAdminClient().from("series_shows").insert({ title: input.title, synopsis: input.synopsis, categories: input.categories, age_rating: input.ageRating }).select("*").single(); if (error) throw error; return mapShow(data as ShowRow); }
export async function listSeriesSeasons(seriesId: string) { const { data, error } = await createSupabaseAdminClient().from("series_seasons").select("*").eq("series_id", seriesId).order("number"); if (error) throw error; return (data as SeasonRow[]).map(mapSeason); }
export async function createSeriesSeason(seriesId: string, number: number, title: string) { const { data, error } = await createSupabaseAdminClient().from("series_seasons").insert({ series_id: seriesId, number, title: title.trim() || `${number}-р бүлэг` }).select("*").single(); if (error) throw error; return mapSeason(data as SeasonRow); }
export async function updateSeriesShow(id:string,input:{title:string;synopsis:string;categories:string[];ageRating:string}){const db=createSupabaseAdminClient();await ensureCanonicalSeries(id);const {data,error}=await db.from("series_shows").update({title:input.title,synopsis:input.synopsis,categories:input.categories,age_rating:input.ageRating}).eq("id",id).select("*").single();if(error)throw error;const {error:canonicalError}=await db.from("series").update({title:input.title,description:input.synopsis,age_rating:input.ageRating,updated_at:new Date().toISOString()}).eq("id",id);if(canonicalError)throw canonicalError;const {data:art}=await db.from("series").select("poster_url").eq("id",id).single();return mapShow(data as ShowRow,art?.poster_url);}

// The admin UI originally used series_shows/series_seasons while movies has
// foreign keys to series/seasons. Keep both representations synchronized so an
// episode can always be inserted without a foreign-key failure.
export async function ensureCanonicalSeries(seriesId: string, seasonId?: string) {
  const db = createSupabaseAdminClient();
  const { data: canonical } = await db.from("series").select("id").eq("id", seriesId).maybeSingle();
  if (!canonical) {
    const { data: show, error: showError } = await db.from("series_shows").select("id,title,synopsis,age_rating").eq("id", seriesId).single();
    if (showError || !show) throw new Error("Цувралын үндсэн бүртгэл олдсонгүй.");
    const { error } = await db.from("series").upsert({ id: show.id, title: show.title, slug: `series-${show.id}`, description: show.synopsis ?? "", age_rating: show.age_rating ?? "13+", status: "published" });
    if (error) throw new Error("Цувралын бүртгэл синк хийж чадсангүй: " + error.message);
  }
  if (seasonId) {
    const { data: canonicalSeason } = await db.from("seasons").select("id").eq("id", seasonId).maybeSingle();
    if (!canonicalSeason) {
      const { data: season, error: seasonError } = await db.from("series_seasons").select("id,series_id,number,title").eq("id", seasonId).eq("series_id", seriesId).single();
      if (seasonError || !season) throw new Error("Бүлгийн үндсэн бүртгэл олдсонгүй.");
      const { error } = await db.from("seasons").upsert({ id: season.id, series_id: seriesId, number: season.number, title: season.title });
      if (error) throw new Error("Бүлгийн бүртгэл синк хийж чадсангүй: " + error.message);
    }
  }
}
