import Link from "next/link";
import type { LocalUser } from "@/lib/auth/local-auth";
import { LogoutButton } from "./logout-button";
import { AdminChatLink } from "./admin-chat-link";
export function AdminShell({
  user,
  children,
  active = "dashboard",
}: {
  user: LocalUser;
  children: React.ReactNode;
  active?: string;
}) {
  return (
    <main className="admin-layout">
      <aside className="admin-side">
        <Link href="/" className="brand">
          <span>Х</span>ҮРЭЭ
        </Link>
        <small>CONTENT STUDIO</small>
        <nav>
          <Link
            className={active === "dashboard" ? "active" : ""}
            href="/admin"
          >
            ▦ <span>Хянах самбар</span>
          </Link>
          <Link
            className={active === "movies" ? "active" : ""}
            href="/admin/movies"
          >
            ▶ <span>Кино</span>
          </Link>
          <Link
            className={active === "series" ? "active" : ""}
            href="/admin/series"
          >
            ▤ <span>Олон ангит</span>
          </Link>
          <Link
            className={active === "vertical" ? "active" : ""}
            href="/admin/vertical"
          >
            ▯ <span>Босоо драма</span>
          </Link>
          <Link
            className={active === "adult" ? "active" : ""}
            href="/admin/adult"
          >
            18+ <span>Насанд хүрэгчдийн</span>
          </Link>
          <Link
            className={active === "live" ? "active" : ""}
            href="/admin/live"
          >
            ● <span>Live хяналт</span>
          </Link>
          <Link
            className={active === "users" ? "active" : ""}
            href="/admin/users"
          >
            ◉ <span>Хэрэглэгчид</span>
          </Link>
          <AdminChatLink active={active === "chat"} />
          <Link href="/movies">
            ◉ <span>Нийтийн каталог</span>
          </Link>
        </nav>
        <div className="admin-user">
          <i>{user.name.slice(0, 1).toUpperCase()}</i>
          <span>
            <b>{user.name}</b>
            <small>Администратор</small>
          </span>
          <LogoutButton />
        </div>
      </aside>
      <section className="admin-main">
        <header>
          <span>Админ удирдлага</span>
          <div>
            ⌕ &nbsp; ◌ &nbsp; <b>MN</b>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </section>
    </main>
  );
}
