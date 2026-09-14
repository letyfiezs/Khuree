import { createSupabaseServerClient } from "@/lib/supabase";
import { normalizeIdentifier, pinPassword } from "@/lib/auth/pin-auth";

export async function POST(request: Request) {
  const body = await request.json() as { password?: unknown };
  const password = typeof body.password === "string" ? body.password : "";
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return Response.json({ error: "Нууц үг шинэчлэх хугацаа дууссан байна. Дахин код авна уу." }, { status: 401 });
  const loginKind = user.user_metadata?.login_kind;
  const isPin = loginKind === "phone" || loginKind === "email";
  if (isPin && !/^\d{4}$/.test(password)) return Response.json({ error: "Шинэ PIN яг 4 оронтой байна." }, { status: 400 });
  if (!isPin && password.length < 8) return Response.json({ error: "Нууц үг дор хаяж 8 тэмдэгттэй байна." }, { status: 400 });
  const identifier = isPin ? normalizeIdentifier(loginKind, loginKind === "phone" ? user.user_metadata?.phone || user.phone || "" : user.email) : "";
  const { error } = await supabase.auth.updateUser({ password: isPin ? pinPassword(identifier, password) : password });
  if (error) return Response.json({ error: "Нууц үг шинэчилж чадсангүй. Дахин оролдоно уу." }, { status: 400 });
  await supabase.auth.signOut();
  return Response.json({ ok: true });
}
