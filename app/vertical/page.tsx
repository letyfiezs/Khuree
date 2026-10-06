import { CatalogGrid } from "@/components/catalog-grid";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth/local-auth";
import { getCatalog } from "@/lib/catalog";
import { isVerticalDrama } from "@/lib/vertical-drama";

export const dynamic = "force-dynamic";

export default async function VerticalDramaPage() {
  await requireUser("/vertical");
  const items = (await getCatalog("movie")).filter(
    (item) => item.age !== "18+" && isVerticalDrama(item),
  );
  return (
    <main>
      <SiteHeader />
      <section className="catalog-page">
        <div className="catalog-banner series-banner">
          <p className="section-kicker">БОСООГООР ҮЗЭХ</p>
          <h1>Босоо драма</h1>
          <p>Киногоо сонгоод 3 эсвэл 5 минутын богино ангиудаар үргэлжлүүлэн үзээрэй.</p>
        </div>
        <div className="catalog-body">
          <div className="catalog-title">
            <h2>Бүх босоо драма</h2>
            <span>{items.length} бүтээл</span>
          </div>
          <CatalogGrid items={items} />
        </div>
      </section>
    </main>
  );
}
