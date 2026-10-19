import { getCurrentUser } from "@/lib/auth/local-auth";
import { publicContent } from "@/lib/mobile-public";
import { getPublicSeries } from "@/lib/public-series";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  const { id } = await params;
  const data = await getPublicSeries(id);
  if (!data) return Response.json({ error: "Олдсонгүй." }, { status: 404 });
  if (data.show.age === "18+" && (!user.adultEnabled || !user.adultUnlocked)) {
    return Response.json({ error: "Parental PIN required", adultRequired: true }, { status: 403 });
  }
  return Response.json({
    show: publicContent(data.show),
    seasons: data.seasons,
    episodes: data.episodes.map(publicContent),
  });
}
