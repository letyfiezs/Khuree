import { apiAdmin } from "@/lib/admin";
import { movieStorage } from "@/lib/storage";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const user = await apiAdmin();
  if (!user)
    return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 401 });
  const body = (await request.json()) as {
    title?: string;
    synopsis?: string;
    categories?: string[];
    ageRating?: string;
    seriesTitle?: string;
    seriesId?: string;
    seasonId?: string;
    seasonNumber?: number;
    episodeNumber?: number;
  };
  if (
    !body.title?.trim() ||
    !body.synopsis?.trim() ||
    !body.categories?.length ||
    !body.seriesId ||
    !body.seasonId
  )
    return Response.json({ error: "Ангийн мэдээлэл дутуу." }, { status: 400 });
  const record = movieStorage.createMovie({
    title: body.title.trim(),
    synopsis: body.synopsis.trim(),
    categories: body.categories,
    ageRating: body.ageRating ?? "13+",
    kind: "series",
    seriesTitle: body.seriesTitle,
    seriesId: body.seriesId,
    seasonId: body.seasonId,
    seasonNumber: body.seasonNumber,
    episodeNumber: body.episodeNumber,
    videoKey: "",
    originalFilename: "",
    contentType: "",
    bytes: 0,
    createdBy: user.id,
  });
  return Response.json({
    id: record.id,
    slug: record.slug,
    status: record.status,
  });
}
