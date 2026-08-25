import Link from "next/link";
import { AdultUnlock } from "@/components/adult-unlock";
import { CatalogGrid } from "@/components/catalog-grid";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth/local-auth";
import { getCatalog } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export default async function AdultPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const user = await requireUser("/adult");
  const { returnTo } = await searchParams;
  if (!user.adultEnabled)
    return (
      <main>
        <SiteHeader />
        <section className="account-page">
          <div className="adult-unlock">
            <i>18+</i>
            <h1>18+ хэсэг хаалттай</h1>
            <p>
              Account settings-ээс parental PIN үүсгэж эрхээ идэвхжүүлнэ үү.
            </p>
            <Link className="primary-button" href="/account">
              Тохиргоо нээх
            </Link>
          </div>
        </section>
      </main>
    );
  if (!user.adultUnlocked)
    return (
      <main>
        <SiteHeader />
        <section className="account-page">
          <AdultUnlock
            returnTo={returnTo?.startsWith("/") ? returnTo : "/adult"}
          />
        </section>
      </main>
    );
  const items = (await getCatalog()).filter((item) => item.age === "18+");
  return (
    <main>
      <SiteHeader />
      <section className="catalog-page adult-page">
        <div className="catalog-banner adult-banner">
          <p className="section-kicker">PIN ХАМГААЛАЛТТАЙ</p>
          <h1>18+</h1>
          <p>Зөвхөн насанд хүрсэн хэрэглэгчдэд зориулсан контент.</p>
        </div>
        <div className="catalog-body">
          <div className="catalog-title">
            <h2>18+ бүтээлүүд</h2>
            <span>{items.length} бүтээл</span>
          </div>
          <CatalogGrid items={items} />
        </div>
      </section>
    </main>
  );
}
