import { AdminMovies } from "@/components/admin-movies";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth/local-auth";
import { listCategories } from "@/lib/categories";
import { listMovies } from "@/lib/movies";
import { isVerticalDrama, verticalDramaCategory } from "@/lib/vertical-drama";

export const dynamic = "force-dynamic";

export default async function AdminVerticalDramaPage() {
  const user = await requireAdmin();
  const [items, categories] = await Promise.all([listMovies(), listCategories()]);

  return (
    <AdminShell user={user} active="vertical">
      <AdminMovies
        initial={items.filter(isVerticalDrama)}
        categories={categories.map((category) => category.name)}
        forcedCategory={verticalDramaCategory}
        sectionTitle="Босоо драма"
      />
    </AdminShell>
  );
}
