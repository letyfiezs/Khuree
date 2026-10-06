import { apiAdmin } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function PATCH(request: Request) {
  if (!(await apiAdmin())) return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 403 });
  const body = await request.json() as Record<string, unknown>;
  const positive = (key: string, max = 10000000) => {
    const value = Number(body[key]);
    if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new Error(`${key} утга буруу байна.`);
    return value;
  };
  try {
    const updates = {
      movie_price: positive("movie"), series_price: positive("series"), vertical_price: positive("vertical"),
      adult_price: positive("adult"), vip_price: positive("vip"), plan_days: positive("planDays", 365),
      default_rental_price: positive("defaultRentalPrice"), rental_hours: positive("rentalHours", 720),
      updated_at: new Date().toISOString(),
    };
    const { error } = await createSupabaseAdminClient().from("pricing_settings").update(updates).eq("id", true);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Үнэ хадгалж чадсангүй." }, { status: 400 });
  }
}
