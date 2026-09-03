import type { ContentItem } from "./content";

export const verticalDramaCategory = "Босоо драма";

export function isVerticalDrama(item: ContentItem) {
  return item.kind === "movie" && item.genre.includes(verticalDramaCategory);
}
