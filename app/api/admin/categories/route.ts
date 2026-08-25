import { apiAdmin } from "@/lib/admin";
import {
  createCategory,
  deleteCategory,
  listCategories,
  renameCategory,
} from "@/lib/categories";
export const runtime = "nodejs";
const allowed = async () => Boolean(await apiAdmin());
export async function GET() {
  if (!(await allowed()))
    return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 401 });
  return Response.json({ categories: await listCategories() });
}
export async function POST(request: Request) {
  if (!(await allowed()))
    return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 401 });
  const body = (await request.json()) as { name?: string };
  if (!body.name?.trim())
    return Response.json(
      { error: "Ангиллын нэр оруулна уу." },
      { status: 400 },
    );
  try {
    return Response.json({ category: await createCategory(body.name) });
  } catch {
    return Response.json(
      { error: "Ижил нэртэй ангилал байна." },
      { status: 409 },
    );
  }
}
export async function PATCH(request: Request) {
  if (!(await allowed()))
    return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 401 });
  const body = (await request.json()) as { id?: string; name?: string };
  if (!body.id || !body.name?.trim())
    return Response.json({ error: "Мэдээлэл дутуу." }, { status: 400 });
  try {
    const category = await renameCategory(body.id, body.name);
    return category
      ? Response.json({ category })
      : Response.json({ error: "Олдсонгүй." }, { status: 404 });
  } catch {
    return Response.json(
      { error: "Ижил нэртэй ангилал байна." },
      { status: 409 },
    );
  }
}
export async function DELETE(request: Request) {
  if (!(await allowed()))
    return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  return id && (await deleteCategory(id))
    ? Response.json({ deleted: true })
    : Response.json({ error: "Олдсонгүй." }, { status: 404 });
}
