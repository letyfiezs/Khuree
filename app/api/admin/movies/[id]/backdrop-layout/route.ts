import { apiAdmin } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await apiAdmin())) return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 401 });
  const { id } = await params;
  if (!uuid.test(id)) return Response.json({ error: "ID буруу." }, { status: 400 });
  const body = await request.json() as { x?: number; y?: number; zoom?: number };
  const layout = { backdrop_position_x: clamp(Number(body.x) || 50, 0, 100), backdrop_position_y: clamp(Number(body.y) || 50, 0, 100), backdrop_zoom: clamp(Number(body.zoom) || 100, 100, 200), updated_at: new Date().toISOString() };
  const { error } = await createSupabaseAdminClient().from("movies").update(layout).eq("id", id);
  return error ? Response.json({ error: error.message }, { status: 500 }) : Response.json({ x: layout.backdrop_position_x, y: layout.backdrop_position_y, zoom: layout.backdrop_zoom });
}
