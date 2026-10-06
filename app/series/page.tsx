import { SiteHeader } from "@/components/site-header";
import { CatalogGrid } from "@/components/catalog-grid";
import { getBrowseCatalog } from "@/lib/catalog";
import { requireUser } from "@/lib/auth/local-auth";
import { CatalogPagination, pageItems, pageNumber } from "@/components/catalog-pagination";
export const dynamic = "force-dynamic";
export default async function SeriesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireUser("/series");
  const items = (await getBrowseCatalog("series")).filter((item) => item.age !== "18+");
  const page = pageNumber((await searchParams).page);
  return (
    <main>
      <SiteHeader />
      <section className="catalog-page">
        <div className="catalog-banner series-banner">
          <p className="section-kicker">АНГИ БҮР ШИНЭ ТҮҮХ</p>
          <h1>Олон ангит</h1>
          <p>Дараагийн ангийг нь хүлээлгэх хамгийн сонирхолтой цувралууд.</p>
        </div>
        <div className="catalog-body">
          <div className="catalog-title">
            <h2>Бүх цуврал</h2>
            <span>{items.length} бүтээл</span>
          </div>
          <CatalogGrid items={pageItems(items, page)} />
          <CatalogPagination total={items.length} page={page} href="/series" />
        </div>
      </section>
    </main>
  );
}
