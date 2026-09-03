import "server-only";

import { createSupabaseAdminClient } from "./supabase";

export const LIVE_ACTIVE_WINDOW_MS = 45_000;

type PresenceRow = {
  viewer_id: string;
  movie_id: string;
  last_seen_at: string;
};

type MovieRow = {
  id: string;
  slug: string;
  title: string;
  poster_url: string | null;
  release_year: number | null;
  kind: "movie" | "series";
  series_id: string | null;
};

type SeriesRow = {
  id: string;
  slug: string;
  title: string;
  poster_url: string | null;
};

export type ActiveViewing = {
  viewerId: string;
  lastSeenAt: string;
  content: {
    id: string;
    slug: string;
    title: string;
    posterUrl: string | null;
    year: number | null;
    kind: "movie" | "series";
    seriesId: string | null;
  };
};

export async function listActiveViewing(): Promise<ActiveViewing[]> {
  const db = createSupabaseAdminClient();
  const cutoff = new Date(Date.now() - LIVE_ACTIVE_WINDOW_MS).toISOString();
  const { data: presence, error: presenceError } = await db
    .from("live_movie_presence")
    .select("viewer_id,movie_id,last_seen_at")
    .gte("last_seen_at", cutoff)
    .limit(10_000);

  if (presenceError) throw presenceError;
  const rows = (presence ?? []) as PresenceRow[];
  const privateViewerIds = new Set<string>();
  for (let page = 1; ; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const user of data.users) {
      if (user.app_metadata?.presence_private === true) privateViewerIds.add(user.id);
    }
    if (data.users.length < 1000) break;
  }
  const visibleRows = rows.filter((row) => !privateViewerIds.has(row.viewer_id));
  const movieIds = [...new Set(visibleRows.map((row) => row.movie_id))];
  if (!movieIds.length) return [];

  const { data: movies, error: movieError } = await db
    .from("movies")
    .select("id,slug,title,poster_url,release_year,kind,series_id")
    .in("id", movieIds)
    .eq("status", "published");
  if (movieError) throw movieError;

  const movieRows = (movies ?? []) as MovieRow[];
  const movieById = new Map(movieRows.map((movie) => [movie.id, movie]));
  const seriesIds = [...new Set(movieRows.flatMap((movie) => movie.series_id ? [movie.series_id] : []))];
  const { data: series, error: seriesError } = seriesIds.length
    ? await db.from("series").select("id,slug,title,poster_url").in("id", seriesIds).eq("status", "published")
    : { data: [], error: null };
  if (seriesError) throw seriesError;

  const seriesById = new Map(((series ?? []) as SeriesRow[]).map((show) => [show.id, show]));
  return visibleRows.flatMap((row) => {
    const movie = movieById.get(row.movie_id);
    if (!movie) return [];
    const show = movie.series_id ? seriesById.get(movie.series_id) : undefined;
    return [{
      viewerId: row.viewer_id,
      lastSeenAt: row.last_seen_at,
      content: show ? {
        id: show.id,
        slug: show.slug,
        title: show.title,
        posterUrl: show.poster_url ?? movie.poster_url,
        year: movie.release_year,
        kind: "series" as const,
        seriesId: show.id,
      } : {
        id: movie.id,
        slug: movie.slug,
        title: movie.title,
        posterUrl: movie.poster_url,
        year: movie.release_year,
        kind: movie.kind,
        seriesId: movie.series_id,
      },
    }];
  });
}
