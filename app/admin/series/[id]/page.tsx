import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminMovies } from "@/components/admin-movies";
import { AdminShell } from "@/components/admin-shell";
import { SeasonCreate } from "@/components/season-create";
import { requireAdmin } from "@/lib/auth/local-auth";
import { listCategories } from "@/lib/categories";
import type { ContentItem } from "@/lib/content";
import { getSeriesShow, listSeriesSeasons } from "@/lib/series-admin";
import { listMovies } from "@/lib/movies";
export const dynamic = "force-dynamic";
export default async function SeriesDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const user = await requireAdmin();
  const id = (await params).id;
  const show = await getSeriesShow(id);
  if (!show) notFound();
  const seasons = await listSeriesSeasons(id);
  const requested = (await searchParams).season;
  const active =
    seasons.find((season) => season.id === requested) ?? seasons[0];
  const episodes: ContentItem[] = active
    ? (await listMovies())
        .filter(
          (movie) => movie.seriesId === id && movie.seasonId === active.id,
        )
        .map((movie) => ({
          id: movie.id,
          slug: movie.slug,
          title: movie.title,
          synopsis: movie.synopsis,
          year: movie.year,
          duration: movie.duration,
          age: movie.age,
          rating: movie.rating,
          genre: movie.genre,
          kind: "series",
          status: movie.status,
          accent: "#581018",
          videoKey: movie.videoKey,
          subtitles: movie.subtitles,
          posterUrl: movie.posterUrl,
          seriesTitle: show.title,
          seasonNumber: active.number,
          episodeNumber: movie.episodeNumber,
        }))
    : [];
  return (
    <AdminShell user={user} active="series">
      <div className="series-detail-head">
        <div>
          <Link href="/admin/series">← Олон ангит</Link>
          <h1>{show.title}</h1>
          <p>{show.synopsis}</p>
        </div>
        <SeasonCreate
          seriesId={id}
          nextNumber={(seasons.at(-1)?.number ?? 0) + 1}
        />
      </div>
      {seasons.length ? (
        <>
          <nav className="season-tabs">
            {seasons.map((season) => (
              <Link
                className={season.id === active?.id ? "active" : ""}
                href={`/admin/series/${id}?season=${season.id}`}
                key={season.id}
              >
                {season.title}
              </Link>
            ))}
          </nav>
          {active && (
            <AdminMovies
              initial={episodes}
              mode="series"
              categories={(await listCategories()).map((item) => item.name)}
              fixedSeries={{
                id,
                title: show.title,
                seasonId: active.id,
                seasonNumber: active.number,
              }}
            />
          )}
        </>
      ) : (
        <div className="empty-season">
          <b>Эхний бүлгээ үүсгэнэ үү</b>
          <p>
            Бүлэг үүссэний дараа ангиудын video upload хийх боломж нээгдэнэ.
          </p>
        </div>
      )}
    </AdminShell>
  );
}
