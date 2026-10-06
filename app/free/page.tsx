import { CatalogGrid } from "@/components/catalog-grid";
import { CatalogPagination, pageItems, pageNumber } from "@/components/catalog-pagination";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth/local-auth";
import { getBrowseCatalog } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export default async function FreePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireUser("/free");
  const items = (await getBrowseCatalog()).filter((item) => item.isFree && item.age !== "18+");
  const page = pageNumber((await searchParams).page);
  return <main><SiteHeader /><section className="catalog-page"><div className="catalog-banner free-banner"><p className="section-kicker">ТӨЛБӨРГҮЙ ҮЗЭХ</p><h1>Үнэгүй</h1><p>Админаас үнэгүй болгосон кино, олон ангит болон босоо драмууд.</p></div><div className="catalog-body"><div className="catalog-title"><h2>Үнэгүй бүтээлүүд</h2><span>{items.length} бүтээл</span></div><CatalogGrid items={pageItems(items, page)} /><CatalogPagination total={items.length} page={page} href="/free" /></div></section></main>;
}
