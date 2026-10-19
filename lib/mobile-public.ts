import type { ContentItem } from "@/lib/content";

/** Public catalog payload — omits storage keys so clients never receive private object paths. */
export function publicContent(item: ContentItem) {
  const { videoKey, videoBytes, ...rest } = item;
  return { ...rest, hasVideo: Boolean(videoKey) };
}

export type PublicContent = ReturnType<typeof publicContent>;
