import { AdminMovies } from "@/components/admin-movies";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth/local-auth";
import { listCategories } from "@/lib/categories";
import { listMovies } from "@/lib/movies";
export const dynamic = "force-dynamic";
export default async function AdminAdultPage() {
  const user = await requireAdmin();
  const items = (await listMovies()).filter((movie) => movie.kind === "movie" && movie.age === "18+");
  const categories = await listCategories();
  return <AdminShell user={user} active="adult"><AdminMovies initial={items} categories={categories.map((item) => item.name)} forcedAgeRating="18+" /></AdminShell>;
}
