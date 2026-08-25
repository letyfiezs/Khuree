import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getBrowseCatalog } from "@/lib/catalog";
import { HomeRail } from "@/components/home-rail";
import { popularMovieIds } from "@/lib/popular";
import { RecentlyWatched } from "@/components/recently-watched";

export const dynamic = "force-dynamic";

export default async function Home() {
  const allItems = await getBrowseCatalog();
  const items = allItems.filter((item) => item.age !== "18+");
  const movies = items.filter((item) => item.kind === "movie");
  const series = items.filter((item) => item.kind === "series");
  const adult = allItems.filter((item) => item.age === "18+");
  const popularIds = await popularMovieIds();
  const popular = [...items].sort((a,b) => {
    const ai=popularIds.indexOf(a.id), bi=popularIds.indexOf(b.id);
    return (ai<0?Number.MAX_SAFE_INTEGER:ai)-(bi<0?Number.MAX_SAFE_INTEGER:bi);
  });
  const featured = items.find((item) => item.featured) ?? items[0];
  return (
    <main>
      <SiteHeader />
      {featured ? (
        <section
          className={`hero ${featured.backdropUrl || featured.posterUrl ? "has-featured-poster" : ""} ${featured.backdropUrl ? "has-backdrop" : ""}`}
        >
          {(featured.backdropUrl || featured.posterUrl) && (
            <div
              className="hero-poster-art"
              style={{
                backgroundImage: `url(${featured.backdropUrl || featured.posterUrl})`,
                "--hero-x": `${featured.backdropPositionX ?? 50}%`,
                "--hero-y": `${featured.backdropPositionY ?? 50}%`,
                "--hero-zoom": (featured.backdropZoom ?? 100) / 100,
              } as React.CSSProperties}
            />
          )}
          <div className="hero-glow" />
          <div className="hero-content">
            <p className="eyebrow">
              <span /> ШИНЭЭР НЭМЭГДСЭН
            </p>
            <h1>{featured.title}</h1>
            <div className="hero-meta">
              <span>{featured.year}</span>
              <span>{featured.age}</span>
              <span className="quality">HD</span>
            </div>
            <p className="hero-copy">{featured.synopsis}</p>
            <div className="hero-actions">
              <Link href={featured.kind === "series" && featured.seriesId ? `/series/${featured.seriesId}` : `/watch/${encodeURIComponent(featured.slug)}`} className="primary-button">
                ▶ &nbsp;Үзэх
              </Link>
              <Link
                href={featured.kind === "series" && featured.seriesId ? `/series/${featured.seriesId}` : `/movie/${encodeURIComponent(featured.slug)}`}
                className="secondary-button"
              >
                ⓘ &nbsp;Дэлгэрэнгүй
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="hero empty-hero">
          <div className="hero-content">
            <p className="eyebrow">
              <span /> ХҮРЭЭ
            </p>
            <h1>ТАНЫ КАТАЛОГ</h1>
            <p className="hero-copy">
              Админ хэсгээс анхны кино эсвэл олон ангит бүтээлээ нэмнэ үү.
            </p>
          </div>
        </section>
      )}
      <RecentlyWatched />
      <HomeRail kicker="ОДОО ҮЗЭХ" title="Шинээр нэмэгдсэн" href="/movies" items={items} />
      <HomeRail kicker="ТӨЛБӨРГҮЙ ҮЗЭХ" title="Үнэгүй" href="/movies" items={movies} />
      <HomeRail kicker="ҮЗЭГЧДИЙН СОНГОЛТ" title="Их үзэлттэй" href="/movies" items={popular} />
      <HomeRail kicker="АНГИ БҮР ШИНЭ ТҮҮХ" title="Олон ангит" href="/series" items={series} />
      <HomeRail kicker="НАСАНД ХҮРЭГЧДЭД" title="+18" href="/adult" items={adult} />
    </main>
  );
}
