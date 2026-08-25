import Link from "next/link";
import { requireAdmin } from "@/lib/auth/local-auth";
import { AdminShell } from "@/components/admin-shell";
import { getCatalog } from "@/lib/catalog";
import { AdminLiveStats } from "@/components/admin-live-stats";
export const dynamic = "force-dynamic";
export default async function Admin() {
  const [user, content] = await Promise.all([requireAdmin(), getCatalog()]);
  return (
    <AdminShell user={user}>
      <div className="admin-toolbar">
        <div>
          <h1>Өдрийн мэнд, {user.name}</h1>
          <p>Хүрээ платформын өнөөдрийн тойм</p>
        </div>
        <Link href="/admin/movies" className="primary-button">
          ＋ Контент нэмэх
        </Link>
      </div>
      <AdminLiveStats recent={content.slice(0, 4).map(({ id, title, year, kind, status, accent }) => ({ id, title, year, kind, status, accent }))} />
    </AdminShell>
  );
}
