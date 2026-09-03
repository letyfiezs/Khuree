import { createSupabaseServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json() as { password?: unknown };
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8) return Response.json({ error: "Нууц үг 8-аас дээш тэмдэгттэй байна." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return Response.json({ error: "Нууц үг шинэчлэх хугацаа дууссан байна. Дахин код авна уу." }, { status: 401 });
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return Response.json({ error: "Нууц үг шинэчилж чадсангүй. Дахин оролдоно уу." }, { status: 400 });
  await supabase.auth.signOut();
  return Response.json({ ok: true });
}
