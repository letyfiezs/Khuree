import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { ContentItem } from "@/lib/content";
import { listPublicMovies } from "@/lib/movies";
import { getSeriesShow, listSeriesSeasons, listSeriesShows } from "@/lib/series-admin";

function seriesCard(show: Awaited<ReturnType<typeof listSeriesShows>>[number], episodes: ContentItem[]): ContentItem | undefined {
  if (!episodes.length) return undefined;
  const sorted = [...episodes].sort((a, b) =>
    (b.seasonNumber ?? 0) - (a.seasonNumber ?? 0) ||
    (b.episodeNumber ?? 0) - (a.episodeNumber ?? 0),
  );
  const art = sorted.find((episode) => episode.posterUrl) ?? sorted[0];
  const backdrop = sorted.find((episode) => episode.backdropUrl);
  return {
    ...art,
    id: show.id,
    slug: show.id,
    title: show.title,
    synopsis: show.synopsis,
    age: show.ageRating,
    genre: show.categories,
    kind: "series",
    seriesId: show.id,
    episodes: episodes.length,
    videoKey: undefined,
    posterUrl: show.posterUrl ?? art.posterUrl,
    backdropUrl: backdrop?.backdropUrl ?? art.backdropUrl,
  };
}

const listPublicSeriesCached = unstable_cache(async function listPublicSeries() {
  const [shows, movies] = await Promise.all([listSeriesShows(), listPublicMovies()]);
  return shows
    .map((show) => seriesCard(show, movies.filter((movie) => movie.kind === "series" && movie.seriesId === show.id && movie.status === "published")))
    .filter((show): show is ContentItem => Boolean(show));
}, ["khuree-public-series-v1"], { revalidate: 30, tags: ["catalog", "series"] });
export const listPublicSeries = cache(listPublicSeriesCached);

export async function getPublicSeries(id: string) {
  const [show, seasons, movies] = await Promise.all([
    getSeriesShow(id),
    listSeriesSeasons(id),
    listPublicMovies(),
  ]);
  if (!show) return undefined;
  const episodes = movies
    .filter((movie) => movie.kind === "series" && movie.seriesId === id && movie.status === "published")
    .sort((a, b) => (a.seasonNumber ?? 0) - (b.seasonNumber ?? 0) || (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0));
  const card = seriesCard(show, episodes);
  return card ? { show: card, seasons, episodes } : undefined;
}
