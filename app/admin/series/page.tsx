import { AdminSeriesHub } from "@/components/admin-series-hub";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth/local-auth";
import { listCategories } from "@/lib/categories";
import { listSeriesShows } from "@/lib/series-admin";
export const dynamic = "force-dynamic";
export default async function AdminSeriesPage() {
  const user = await requireAdmin();
  return (
    <AdminShell user={user} active="series">
      <AdminSeriesHub
        initial={await listSeriesShows()}
        categories={(await listCategories()).map((item) => item.name)}
      />
    </AdminShell>
  );
}
