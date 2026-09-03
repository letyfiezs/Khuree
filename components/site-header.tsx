import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/local-auth";
import { getCatalog } from "@/lib/catalog";
import { LogoutButton } from "./logout-button";
import { SearchDialog } from "./search-dialog";
import { listPublicCategories } from "@/lib/categories";
import { audioLabels, type AudioLabel } from "@/lib/content";
export async function SiteHeader() {
  const [user, catalog, allCategories] = await Promise.all([
    getCurrentUser(),
    getCatalog(),
    listPublicCategories(),
  ]);
  const items = catalog
    .filter((item) => item.age !== "18+" || user?.adultUnlocked)
    .map(({ id, slug, title, synopsis, genre, kind, year }) => ({
      id,
      slug,
      title,
      synopsis,
      genre,
      kind,
      year,
    }));
  const categories = allCategories.filter((category) =>
    category.name !== "Босоо драма" && category.name !== "Орчуулгатай" && !audioLabels.includes(category.name as AudioLabel),
  );
  return (
    <header className="site-header solid-on-page">
      <a href="/" className="brand">
        <span>Х</span>ҮРЭЭ
      </a>
      <nav>
        <a href="/">Нүүр</a>
        <span className="nav-dropdown">
          <a href="/movies">Кино⌄</a>
          <span>
            <a href="/movies">Бүх кино</a>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${encodeURIComponent(category.name)}?kind=movie`}
              >
                {category.name}
              </Link>
            ))}
          </span>
        </span>
        <span className="nav-dropdown">
          <a href="/series">Олон ангит⌄</a>
          <span>
            <a href="/series">Бүх олон ангит</a>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${encodeURIComponent(category.name)}?kind=series`}
              >
                {category.name}
              </Link>
            ))}
          </span>
        </span>
        <a href="/vertical">Босоо драма</a>
        <a className="adult-nav" href="/adult">
          18+
        </a>
        <a href="/live">Шууд ТВ</a>
      </nav>
      <details className="mobile-menu">
        <summary aria-label="Цэс нээх">
          <span />
          <span />
          <span />
        </summary>
        <div>
          <a href="/">Нүүр</a>
          <a href="/movies">Кино</a>
          <a href="/series">Олон ангит</a>
          <a href="/vertical">Босоо драма</a>
          <a href="/adult">18+</a>
          <a href="/live">Шууд ТВ</a>
          {user ? (
            <>
              <Link className="mobile-vip" href="/subscribe">
                VIP болох
              </Link>
              <Link href="/account">Миний бүртгэл</Link>
              <span className="mobile-logout"><LogoutButton /></span>
            </>
          ) : (
            <>
              <Link href="/login">Нэвтрэх</Link>
              <Link className="mobile-vip" href="/signup">
                Бүртгүүлэх
              </Link>
            </>
          )}
        </div>
      </details>
      <div className="header-actions">
        <SearchDialog items={items} />
        {user ? (
          <span className="desktop-auth">
            <Link className="vip-link" href="/subscribe">
              VIP болох
            </Link>
            <Link className="user-chip" href="/account">
              {user.name}
            </Link>
            <LogoutButton />
          </span>
        ) : (
          <span className="desktop-auth">
            <Link href="/login" className="login-link">
              Нэвтрэх
            </Link>
            <Link href="/signup" className="login-button">
              Бүртгүүлэх
            </Link>
          </span>
        )}
      </div>
    </header>
  );
}
