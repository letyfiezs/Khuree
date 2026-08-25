import { CatalogGrid } from "@/components/catalog-grid";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth/local-auth";
import { getCatalog } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ kind?: "movie" | "series" }>;
}) {
  const name = decodeURIComponent((await params).name);
  const kind = (await searchParams).kind;
  await requireUser(
    `/category/${encodeURIComponent(name)}${kind ? `?kind=${kind}` : ""}`,
  );
  const items = (await getCatalog()).filter(
    (item) =>
      item.age !== "18+" &&
      item.genre.includes(name) &&
      (!kind || item.kind === kind),
  );
  return (
    <main>
      <SiteHeader />
      <section className="catalog-page">
        <div className="catalog-banner movie-banner">
          <p className="section-kicker">АНГИЛАЛ</p>
          <h1>{name}</h1>
          <p>
            “{name}” ангиллын{" "}
            {kind === "series"
              ? "олон ангит бүтээлүүд"
              : kind === "movie"
                ? "кинонууд"
                : "кино, олон ангит бүтээлүүд"}
            .
          </p>
        </div>
        <div className="catalog-body">
          <div className="catalog-title">
            <h2>{name}</h2>
            <span>{items.length} бүтээл</span>
          </div>
          <CatalogGrid items={items} />
        </div>
      </section>
    </main>
  );
}
