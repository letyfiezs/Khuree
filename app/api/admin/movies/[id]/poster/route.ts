import { apiAdmin } from "@/lib/admin";
import { publicR2Url, putR2Object } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await apiAdmin())) return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 401 });
  const { id } = await params;
  if (!uuid.test(id)) return Response.json({ error: "Киноны ID буруу байна." }, { status: 400 });
  const form = await request.formData();
  const file = form.get("poster");
  if (!(file instanceof File)) return Response.json({ error: "Зураг сонгоно уу." }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return Response.json({ error: "Зураг 8MB-аас бага байна." }, { status: 413 });
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/jpeg" ? "jpg" : null;
  if (!extension) return Response.json({ error: "JPG, PNG эсвэл WEBP зураг оруулна уу." }, { status: 400 });
  const db = createSupabaseAdminClient();
  const { data: movie } = await db.from("movies").select("id").eq("id", id).maybeSingle();
  if (!movie) return Response.json({ error: "Кино олдсонгүй." }, { status: 404 });
  const key = `posters/${id}/${crypto.randomUUID()}.${extension}`;
  await putR2Object(key, Buffer.from(await file.arrayBuffer()), file.type);
  const posterUrl = publicR2Url(key);
  if (!posterUrl) return Response.json({ error: "R2 public URL тохируулаагүй байна." }, { status: 500 });
  const { error } = await db.from("movies").update({ poster_url: posterUrl, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return Response.json({ error: "Thumbnail мэдээлэл хадгалж чадсангүй: " + error.message }, { status: 500 });
  return Response.json({ posterUrl });
}
