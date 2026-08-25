import { SiteHeader } from "@/components/site-header";
import { CatalogGrid } from "@/components/catalog-grid";
import { getCatalog } from "@/lib/catalog";
import { requireUser } from "@/lib/auth/local-auth";
export const dynamic = "force-dynamic";
export default async function MoviesPage() {
  await requireUser("/movies");
  const items = (await getCatalog("movie")).filter((item) => item.age !== "18+");
  return (
    <main>
      <SiteHeader />
      <section className="catalog-page">
        <div className="catalog-banner movie-banner">
          <p className="section-kicker">БҮРЭН ХЭМЖЭЭНИЙ</p>
          <h1>Кино</h1>
          <p>
            Монголын шинэ түүхүүдээс эхлээд дэлхийн шилдэг бүтээлүүдийг нэг
            дороос.
          </p>
        </div>
        <div className="catalog-body">
          <div className="catalog-title">
            <h2>Бүх кино</h2>
            <span>{items.length} бүтээл</span>
          </div>
          <CatalogGrid items={items} />
        </div>
      </section>
    </main>
  );
}
