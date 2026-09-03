import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogItem } from "@/lib/catalog";
import { PlayerShell } from "@/components/player-shell";
import { requireAdultAccess, requireDeviceAccess, requireUser, requireWatchAccess } from "@/lib/auth/local-auth";
import { listMovies } from "@/lib/movies";
import { isVerticalDrama } from "@/lib/vertical-drama";
import { signedR2PlaybackUrl } from "@/lib/r2";
export const dynamic = "force-dynamic";
export default async function Watch({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser(`/watch/${slug}`);
  await requireDeviceAccess(user, `/watch/${slug}`);
  const item = await getCatalogItem(slug);
  if (!item) notFound();
  if (item.age === "18+") requireWatchAccess(user, "adult");
  else if (isVerticalDrama(item)) requireWatchAccess(user, "vertical");
  else if (item.kind === "series") requireWatchAccess(user, "series");
  else if (item.kind === "movie") requireWatchAccess(user, "movie");
  if (item.age === "18+") await requireAdultAccess(user, `/watch/${slug}`);
  const seriesEpisodes = item.kind === "series" && item.seriesId
    ? (await listMovies()).filter((episode) => episode.kind === "series" && episode.seriesId === item.seriesId && episode.status === "published").sort((a, b) => (a.seasonNumber ?? 0) - (b.seasonNumber ?? 0) || (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0))
    : [];
  const episodeIndex = seriesEpisodes.findIndex((episode) => episode.id === item.id);
  const nextEpisode = episodeIndex >= 0 ? seriesEpisodes[episodeIndex + 1] : undefined;
  // Entitlement, device and parental checks are complete above. A short-lived
  // R2 URL avoids routing multi-gigabyte video through a Vercel function.
  const videoUrl = item.videoKey ? await signedR2PlaybackUrl(item.videoKey) : undefined;
  return (
    <main className="watch-page">
      <div className="watch-top">
        <Link href={item.kind === "series" && item.seriesId ? `/series/${item.seriesId}` : `/movie/${encodeURIComponent(item.slug)}`}>← Буцах</Link>
        <div>
          <b>{item.title}</b>
          <span>
            {item.kind === "series"
              ? `${item.seasonNumber ?? 1}-р бүлэг · ${item.episodeNumber ?? 1}-р анги`
              : "Бүрэн хэмжээний кино"}
          </span>
        </div>
        <span />
      </div>
      <PlayerShell
        movieId={item.id}
        title={item.title}
        manifestUrl={videoUrl}
        subtitles={item.subtitles}
        recentItem={{ id: item.id, slug: item.slug, title: item.title, posterUrl: item.posterUrl, year: item.year, age: item.age, kind: item.kind, seriesTitle: item.seriesTitle, seasonNumber: item.seasonNumber, episodeNumber: item.episodeNumber, audioLabel: item.audioLabel }}
      />
      {nextEpisode && <Link className="next-episode" href={`/watch/${encodeURIComponent(nextEpisode.slug)}`}><span><small>ДАРААГИЙН АНГИ</small><b>{nextEpisode.title}</b></span><strong>Үзэх ▶</strong></Link>}
      {seriesEpisodes.length > 0 && <section className="watch-episode-list">
        <div className="watch-episode-heading"><span><small>ЦУВРАЛЫН АНГИУД</small><b>Бүх анги</b></span><em>{seriesEpisodes.length} анги</em></div>
        <div>{seriesEpisodes.map((episode) => <Link className={episode.id === item.id ? "current" : ""} href={`/watch/${encodeURIComponent(episode.slug)}`} key={episode.id}>
          <i className={episode.posterUrl ? "has-image" : ""} style={episode.posterUrl ? { backgroundImage: `url(${episode.posterUrl})` } : undefined}>{!episode.posterUrl && (episode.episodeNumber ?? "—")}</i>
          <span><small>{episode.seasonNumber ?? 1}-р бүлэг · {episode.episodeNumber ?? 1}-р анги</small><b>{episode.title}</b></span>
          <strong>{episode.id === item.id ? "ҮЗЭЖ БАЙНА" : "▶"}</strong>
        </Link>)}</div>
      </section>}
      <div className="watch-note">
        <b>{item.videoKey ? "Local secure playback" : "Demo player"}</b>
        <span>
          {item.videoKey
            ? "Видео зөвхөн баталгаажсан хэрэглэгчид range streaming-ээр хүрнэ."
            : "Энэ demo бүтээлд видео файл холбогдоогүй байна."}
        </span>
      </div>
    </main>
  );
}
