import { apiAdmin } from "@/lib/admin";
import { publicR2Url, putR2Object } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await apiAdmin())) return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 401 });
  const { id } = await params;
  if (!uuid.test(id)) return Response.json({ error: "ID буруу." }, { status: 400 });
  const file = (await request.formData()).get("backdrop");
  if (!(file instanceof File)) return Response.json({ error: "Зураг сонгоно уу." }, { status: 400 });
  if (file.size > 12 * 1024 * 1024) return Response.json({ error: "Зураг 12MB-аас бага байна." }, { status: 413 });
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/jpeg" ? "jpg" : null;
  if (!ext) return Response.json({ error: "JPG, PNG эсвэл WEBP зураг оруулна уу." }, { status: 400 });
  const key = `backdrops/${id}/${crypto.randomUUID()}.${ext}`;
  await putR2Object(key, Buffer.from(await file.arrayBuffer()), file.type);
  const backdropUrl = publicR2Url(key);
  const { error } = await createSupabaseAdminClient().from("movies").update({ backdrop_url: backdropUrl, updated_at: new Date().toISOString() }).eq("id", id);
  return error ? Response.json({ error: error.message }, { status: 500 }) : Response.json({ backdropUrl });
}
