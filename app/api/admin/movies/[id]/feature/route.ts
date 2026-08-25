import { apiAdmin } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await apiAdmin())) return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 401 });
  const { id } = await params;
  if (!uuid.test(id)) return Response.json({ error: "ID буруу." }, { status: 400 });
  const db = createSupabaseAdminClient();
  await db.from("movies").update({ featured: false }).neq("id", id);
  const { data, error } = await db.from("movies").update({ featured: true, updated_at: new Date().toISOString() }).eq("id", id).select("id").maybeSingle();
  return error || !data ? Response.json({ error: error?.message ?? "Кино олдсонгүй." }, { status: 500 }) : Response.json({ featured: true });
}
