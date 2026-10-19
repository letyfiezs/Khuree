import { getCurrentUser } from "@/lib/auth/local-auth";
import { getCatalogItem } from "@/lib/catalog";
import { publicContent } from "@/lib/mobile-public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  const { slug } = await params;
  const item = await getCatalogItem(slug);
  if (!item) return Response.json({ error: "Олдсонгүй." }, { status: 404 });
  if (item.age === "18+" && (!user.adultEnabled || !user.adultUnlocked)) {
    return Response.json({ error: "Parental PIN required", adultRequired: true }, { status: 403 });
  }
  return Response.json({ item: publicContent(item) });
}
