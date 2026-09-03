import { requireAdmin } from "@/lib/auth/local-auth";
import { AdminShell } from "@/components/admin-shell";
import { AdminMovies } from "@/components/admin-movies";
import type { ContentItem } from "@/lib/content";
import { listMovies } from "@/lib/movies";
import { listCategories } from "@/lib/categories";
import { isVerticalDrama } from "@/lib/vertical-drama";
export const dynamic = "force-dynamic";
export default async function Movies() {
  const user = await requireAdmin();
  const localItems: ContentItem[] = await listMovies();
  const categories = await listCategories();
  return (
    <AdminShell user={user} active="movies">
      <AdminMovies
        initial={localItems.filter(
          (item) => item.kind === "movie" && item.age !== "18+" && !isVerticalDrama(item),
        )}
        categories={categories.map((item) => item.name)}
      />
    </AdminShell>
  );
}
