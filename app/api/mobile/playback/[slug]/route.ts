import { getCurrentUser, getRequestDeviceId, type LocalUser, type WatchSection } from "@/lib/auth/local-auth";
import { getCatalogItem } from "@/lib/catalog";
import { listMovies } from "@/lib/movies";
import { publicContent } from "@/lib/mobile-public";
import { signedR2PlaybackUrl } from "@/lib/r2";
import { isVerticalDrama } from "@/lib/vertical-drama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function watchSectionDenied(user: LocalUser, section: WatchSection) {
  return user.role !== "admin" && (!user.canWatch || !user.watchPermissions[section]);
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });

  const deviceId = await getRequestDeviceId();
  if (user.role !== "admin" && (!deviceId || !user.devices.some((device) => device.id === deviceId))) {
    return Response.json({ error: "Device not registered", deviceSetup: true }, { status: 403 });
  }

  const item = await getCatalogItem(slug);
  if (!item) return Response.json({ error: "Олдсонгүй." }, { status: 404 });

  const section: WatchSection =
    item.age === "18+" ? "adult" : isVerticalDrama(item) ? "vertical" : item.kind === "series" ? "series" : "movie";
  if (watchSectionDenied(user, section)) {
    return Response.json({ error: "Үзэх эрхгүй.", subscribe: true }, { status: 403 });
  }
  if (item.age === "18+" && (!user.adultEnabled || !user.adultUnlocked)) {
    return Response.json({ error: "Parental PIN required", adultRequired: true }, { status: 403 });
  }

  const seriesEpisodes =
    item.kind === "series" && item.seriesId
      ? (await listMovies())
          .filter(
            (episode) =>
              episode.kind === "series" && episode.seriesId === item.seriesId && episode.status === "published",
          )
          .sort(
            (a, b) =>
              (a.seasonNumber ?? 0) - (b.seasonNumber ?? 0) ||
              (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0),
          )
      : [];
  const episodeIndex = seriesEpisodes.findIndex((episode) => episode.id === item.id);
  const nextEpisode = episodeIndex >= 0 ? seriesEpisodes[episodeIndex + 1] : undefined;
  const videoUrl = item.videoKey ? await signedR2PlaybackUrl(item.videoKey) : undefined;

  return Response.json({
    item: publicContent(item),
    videoUrl,
    subtitles: item.subtitles ?? [],
    nextEpisode: nextEpisode ? publicContent(nextEpisode) : null,
    episodes: seriesEpisodes.map(publicContent),
    expiresInSeconds: 4 * 60 * 60,
  });
}
