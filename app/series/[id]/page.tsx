import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { requireAdultAccess, requireUser } from "@/lib/auth/local-auth";
import { getPublicSeries } from "@/lib/public-series";
import { DetailBackButton } from "@/components/detail-back-button";
import { hasContentAccess } from "@/lib/content-access";
import { getPricingSettings } from "@/lib/pricing";
import { RentalCheckout } from "@/components/rental-checkout";

export const dynamic = "force-dynamic";

export default async function PublicSeriesDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/series/${id}`);
  const data = await getPublicSeries(id);
  if (!data) notFound();
  const { show, seasons, episodes } = data;
  if (show.age === "18+") await requireAdultAccess(user, `/series/${id}`);
  const [hasAccess, pricing] = await Promise.all([hasContentAccess(user, show), getPricingSettings()]);
  const firstEpisode = episodes[0];
  return (
    <main>
      <SiteHeader />
      <DetailBackButton fallback={show.age === "18+" ? "/adult" : "/series"} />
      <section className="series-public-hero">
        <div className="series-public-art" style={show.backdropUrl || show.posterUrl ? { backgroundImage: `linear-gradient(90deg,#050505 4%,#05050599 52%,#050505 100%),url(${show.backdropUrl || show.posterUrl})` } : undefined} />
        <div className="series-public-content">
          <p className="section-kicker">ОЛОН АНГИТ</p>
          <h1>{show.title}</h1>
          <p>{show.synopsis}</p>
          <div className="hero-meta"><span>{show.age}</span><span>{episodes.length} анги</span><span className="quality">HD</span></div>
          {firstEpisode && (hasAccess ? <Link className="primary-button" href={`/watch/${encodeURIComponent(firstEpisode.slug)}`}>▶ &nbsp;{show.isFree ? "Үнэгүй үзэх" : "Эхнээс нь үзэх"}</Link> : <RentalCheckout seriesId={show.id} title={show.title} price={show.rentalPrice ?? pricing.defaultRentalPrice} hours={pricing.rentalHours} />)}
        </div>
      </section>
      <section className="series-episodes">
        <p className="section-kicker">БҮЛЭГ БА АНГИУД</p>
        {seasons.map((season) => {
          const seasonEpisodes = episodes.filter((episode) => episode.seasonId === season.id);
          return <div className="public-season" key={season.id}><h2>{season.title}</h2><div>{seasonEpisodes.map((episode) => <Link href={hasAccess ? `/watch/${encodeURIComponent(episode.slug)}` : `?rent=1`} key={episode.id}><i className={episode.posterUrl ? "episode-thumbnail" : ""} style={episode.posterUrl ? { backgroundImage: `url(${episode.posterUrl})` } : undefined}>{!episode.posterUrl && (episode.episodeNumber ?? "—")}</i><span><b>{episode.title}</b><small>{episode.synopsis}</small></span><em>{hasAccess ? "▶ Үзэх" : "Түрээслэх"}</em></Link>)}</div></div>;
        })}
      </section>
    </main>
  );
}
