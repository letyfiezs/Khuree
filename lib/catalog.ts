import { content, type ContentItem, type ContentKind } from "./content";
import { getMovieBySlug, listPublicMovies } from "./movies";
import { listPublicSeries } from "./public-series";
export async function getCatalog(kind?: ContentKind) {
  const databaseItems = await listPublicMovies();
  const all = [...databaseItems, ...content.filter((item) => item.status === "published")];
  return kind ? all.filter((item) => item.kind === kind) : all;
}
export async function getCatalogItem(slug: string): Promise<ContentItem | undefined> {
  return (await getMovieBySlug(slug)) ?? content.find((item) => item.slug === slug);
}
export async function getBrowseCatalog(kind?: ContentKind) {
  const [movies, series] = await Promise.all([getCatalog("movie"), listPublicSeries()]);
  if (kind === "movie") return movies;
  if (kind === "series") return series;
  return [...series, ...movies];
}
