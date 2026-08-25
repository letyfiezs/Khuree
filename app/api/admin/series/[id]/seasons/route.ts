import { apiAdmin } from "@/lib/admin";
import {
  createSeriesSeason,
  getSeriesShow,
  listSeriesSeasons,
} from "@/lib/series-admin";
export const runtime = "nodejs";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await apiAdmin()))
    return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 401 });
  return Response.json({ seasons: await listSeriesSeasons((await params).id) });
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await apiAdmin()))
    return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 401 });
  const id = (await params).id;
  if (!(await getSeriesShow(id)))
    return Response.json({ error: "Цуврал олдсонгүй." }, { status: 404 });
  const body = (await request.json()) as { number?: number; title?: string };
  const number = Number(body.number);
  if (!Number.isInteger(number) || number < 1)
    return Response.json({ error: "Бүлгийн дугаар буруу." }, { status: 400 });
  try {
    return Response.json({
      season: await createSeriesSeason(id, number, body.title ?? ""),
    });
  } catch {
    return Response.json(
      { error: "Энэ бүлэг аль хэдийн байна." },
      { status: 409 },
    );
  }
}
