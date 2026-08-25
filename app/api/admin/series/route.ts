import { apiAdmin } from "@/lib/admin";
import { createSeriesShow, listSeriesShows } from "@/lib/series-admin";
export const runtime = "nodejs";
export async function GET() {
  if (!(await apiAdmin()))
    return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 401 });
  return Response.json({ shows: await listSeriesShows() });
}
export async function POST(request: Request) {
  if (!(await apiAdmin()))
    return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 401 });
  const body = (await request.json()) as {
    title?: string;
    synopsis?: string;
    categories?: string[];
    ageRating?: string;
  };
  if (!body.title?.trim() || !body.synopsis?.trim() || !body.categories?.length)
    return Response.json(
      { error: "Мэдээллээ бүрэн оруулна уу." },
      { status: 400 },
    );
  return Response.json({
    show: await createSeriesShow({
      title: body.title.trim(),
      synopsis: body.synopsis.trim(),
      categories: body.categories,
      ageRating: body.ageRating ?? "13+",
    }),
  });
}
