import { AdminCategories } from "@/components/admin-categories";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth/local-auth";
import { listCategories } from "@/lib/categories";
export const dynamic = "force-dynamic";
export default async function CategoriesPage() {
  const user = await requireAdmin();
  return (
    <AdminShell user={user} active="categories">
      <AdminCategories initial={await listCategories()} />
    </AdminShell>
  );
}
