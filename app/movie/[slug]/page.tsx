import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogItem } from "@/lib/catalog";
import { SiteHeader } from "@/components/site-header";
import { requireAdultAccess, requireUser } from "@/lib/auth/local-auth";
import { DetailBackButton } from "@/components/detail-back-button";
import { isVerticalDrama } from "@/lib/vertical-drama";
import { hasContentAccess } from "@/lib/content-access";
import { getPricingSettings } from "@/lib/pricing";
import { RentalCheckout } from "@/components/rental-checkout";
import { TrailerPlayer } from "@/components/trailer-player";
import { signedR2PlaybackUrl } from "@/lib/r2";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const item = await getCatalogItem((await params).slug);
  return item
    ? {
        title: `${item.title} — Хүрээ`,
        description: item.synopsis,
        openGraph: {
          title: item.title,
          description: item.synopsis,
          images: [],
        },
        twitter: {
          card: "summary",
          title: item.title,
          description: item.synopsis,
          images: [],
        },
      }
    : { title: "Олдсонгүй" };
}
export default async function MovieDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser(`/movie/${slug}`);
  const item = await getCatalogItem(slug);
  if (!item) notFound();
  const [hasAccess, pricing] = await Promise.all([hasContentAccess(user, item), getPricingSettings()]);
  const trailerUrl = item.trailerKey ? await signedR2PlaybackUrl(item.trailerKey, 60 * 60) : undefined;
  if (item.age === "18+") await requireAdultAccess(user, `/movie/${slug}`);
  const seasons: { id: string; title: string }[] = [];
  const episodes: typeof item[] = [];
  const firstEpisode = [...episodes].sort(
    (a, b) =>
      (a.seasonNumber ?? 0) - (b.seasonNumber ?? 0) ||
      (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0),
  )[0];
  const backHref = item.age === "18+" ? "/adult" : isVerticalDrama(item) ? "/vertical" : item.kind === "series" ? "/series" : "/movies";
  return (
    <main>
      <SiteHeader />
      <DetailBackButton fallback={backHref} />
      <section
        className="detail-hero"
        style={{ "--accent": item.accent } as React.CSSProperties}
      >
        <div
          className={`detail-art ${item.posterUrl ? "has-image" : ""}`}
          style={
            item.posterUrl
              ? {
                  backgroundImage: `linear-gradient(0deg,#000a,transparent 55%),url(${item.posterUrl})`,
                }
              : undefined
          }
        >
          <span>ХҮРЭЭ ОРИГИНАЛ</span>
          {!item.posterUrl && <b>{item.title}</b>}
        </div>
        <div className="detail-content">
          <p className="eyebrow">
            <span /> {item.videoKey ? "ШИНЭЭР НЭМЭГДСЭН" : "ОНЦЛОХ БҮТЭЭЛ"}
          </p>
          <h1>{item.title}</h1>
          <div className="hero-meta">
            <b>{item.rating ? `★ ${item.rating}` : "ШИНЭ"}</b>
            <span>{item.year}</span>
            <span>{item.age}</span>
            <span>{isVerticalDrama(item) ? "Бүтэн видео" : item.duration}</span>
            <span className="quality">HD</span>
          </div>
          <p className="hero-copy">{item.synopsis}</p>
          <div className="genre-list">
            {item.genre.map((genre) => (
              <span key={genre}>{genre}</span>
            ))}
          </div>
          <div className="hero-actions">
            {hasAccess ? <Link
              href={
                item.kind === "series" && firstEpisode
                  ? `/watch/${encodeURIComponent(firstEpisode.slug)}`
                  : `/watch/${encodeURIComponent(item.slug)}`
              }
              className="primary-button"
            >
              ▶ &nbsp;{item.isFree ? "Үнэгүй үзэх" : "Одоо үзэх"}
            </Link> : <RentalCheckout movieId={item.id} title={item.title} price={item.rentalPrice ?? pricing.defaultRentalPrice} hours={pricing.rentalHours} />}
            <button className="secondary-button">
              ＋ &nbsp;Миний жагсаалт
            </button>
            {trailerUrl && <TrailerPlayer src={trailerUrl} title={item.title} durationSeconds={item.trailerDurationSeconds ?? 300} />}
          </div>
        </div>
      </section>
      {item.kind === "series" && item.seriesId && (
        <section className="series-episodes">
          <p className="section-kicker">БҮЛЭГ БА АНГИУД</p>
          {seasons.map((season) => {
            const seasonEpisodes = episodes
              .filter((episode) => episode.seasonId === season.id)
              .sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0));
            return (
              <div className="public-season" key={season.id}>
                <h2>{season.title}</h2>
                <div>
                  {seasonEpisodes.map((episode) => (
                    <Link
                      href={episode.videoKey ? `/watch/${encodeURIComponent(episode.slug)}` : "#"}
                      className={!episode.videoKey ? "disabled" : ""}
                      key={episode.id}
                    >
                      <i>{episode.episodeNumber ?? "—"}</i>
                      <span>
                        <b>{episode.title}</b>
                        <small>{episode.synopsis}</small>
                      </span>
                      <em>{episode.videoKey ? "▶ Үзэх" : "Удахгүй"}</em>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}
      <section className="detail-info">
        <div>
          <p className="section-kicker">БҮТЭЭЛИЙН ТУХАЙ</p>
          <h2>Түүх эхлэхэд бэлэн үү?</h2>
        </div>
        <dl>
          <div>
            <dt>Төрөл</dt>
            <dd>
              {item.kind === "series" ? "Олон ангит" : "Бүрэн хэмжээний кино"}
            </dd>
          </div>
          <div>
            <dt>Ангилал</dt>
            <dd>{item.genre.join(", ")}</dd>
          </div>
          <div>
            <dt>Хэл</dt>
            <dd>Монгол</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
