import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/local-auth";
import { getCatalog } from "@/lib/catalog";
import { LogoutButton } from "./logout-button";
import { SearchDialog } from "./search-dialog";
import { listCategories } from "@/lib/categories";
export async function SiteHeader() {
  const user = await getCurrentUser();
  const items = (await getCatalog())
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
  const categories = await listCategories();
  return (
    <header className="site-header solid-on-page">
      <Link href="/" className="brand">
        <span>Х</span>ҮРЭЭ
      </Link>
      <nav>
        <Link href="/">Нүүр</Link>
        <span className="nav-dropdown">
          <Link href="/movies">Кино⌄</Link>
          <span>
            <Link href="/movies">Бүх кино</Link>
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
          <Link href="/series">Олон ангит⌄</Link>
          <span>
            <Link href="/series">Бүх олон ангит</Link>
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
        <Link className="adult-nav" href="/adult">
          18+
        </Link>
        <Link href="/live">Шууд ТВ</Link>
      </nav>
      <details className="mobile-menu">
        <summary aria-label="Цэс нээх">
          <span />
          <span />
          <span />
        </summary>
        <div>
          <Link href="/">Нүүр</Link>
          <Link href="/movies">Кино</Link>
          <Link href="/series">Олон ангит</Link>
          <Link href="/adult">18+</Link>
          <Link href="/live">Шууд ТВ</Link>
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
