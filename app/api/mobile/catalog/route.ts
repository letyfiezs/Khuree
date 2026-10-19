import { getCurrentUser } from "@/lib/auth/local-auth";
import { getBrowseCatalog, getCatalog } from "@/lib/catalog";
import { listPublicCategories } from "@/lib/categories";
import { audioLabels, type AudioLabel } from "@/lib/content";
import { publicContent } from "@/lib/mobile-public";
import { popularMovieIds } from "@/lib/popular";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const [browse, movies, popularIds, allCategories] = await Promise.all([
    getBrowseCatalog(),
    getCatalog("movie"),
    popularMovieIds(),
    listPublicCategories(),
  ]);
  const categories = allCategories.filter(
    (category) =>
      category.name !== "Босоо драма" &&
      category.name !== "Орчуулгатай" &&
      !audioLabels.includes(category.name as AudioLabel),
  );
  const visible = browse.filter((item) => item.age !== "18+" || user?.adultUnlocked);
  return Response.json({
    items: visible.map(publicContent),
    movies: movies.map(publicContent),
    popularIds,
    categories,
    authenticated: Boolean(user),
    adultUnlocked: Boolean(user?.adultUnlocked),
  });
}
