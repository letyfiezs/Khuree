import { VerticalReels, type VerticalReelItem } from "@/components/vertical-reels";
import { requireDeviceAccess, requireUser, requireWatchAccess } from "@/lib/auth/local-auth";
import { getCatalog } from "@/lib/catalog";
import { signedR2PlaybackUrl } from "@/lib/r2";
import { isVerticalDrama } from "@/lib/vertical-drama";

export const dynamic = "force-dynamic";

export default async function VerticalDramaPage() {
  const user = await requireUser("/vertical");
  await requireDeviceAccess(user, "/vertical");
  requireWatchAccess(user, "vertical");
  const items = (await getCatalog("movie")).filter(
    (item) => item.age !== "18+" && isVerticalDrama(item) && item.videoKey,
  );
  const reels = await Promise.all(items.map(async (item): Promise<VerticalReelItem> => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    synopsis: item.synopsis,
    age: item.age,
    duration: item.duration,
    segmentMinutes: item.verticalSegmentMinutes ?? 3,
    posterUrl: item.posterUrl,
    videoUrl: await signedR2PlaybackUrl(item.videoKey!),
    subtitles: (item.subtitles ?? []).map(({ id, label, language, sourceUrl }) => ({ id, label, language, sourceUrl })),
  })));

  return <VerticalReels items={reels} />;
}
