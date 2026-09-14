import { getCurrentUser } from "@/lib/auth/local-auth";
import { authEmail, normalizeIdentifier, pinPassword } from "@/lib/auth/pin-auth";
import { createSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  const body = await request.json() as { currentPassword?: unknown; newPassword?: unknown; confirmPassword?: unknown };
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  const isPin = user.credentialKind === "pin";
  if (newPassword !== confirmPassword) return Response.json({ error: isPin ? "Шинэ PIN-үүд таарахгүй байна." : "Шинэ нууц үгс таарахгүй байна." }, { status: 400 });
  if (isPin && (!/^\d{4}$/.test(currentPassword) || !/^\d{4}$/.test(newPassword))) return Response.json({ error: "Одоогийн болон шинэ PIN яг 4 оронтой байна." }, { status: 400 });
  if (!isPin && newPassword.length < 8) return Response.json({ error: "Шинэ нууц үг дор хаяж 8 тэмдэгттэй байна." }, { status: 400 });
  if (user.credentialKind === "password" && !currentPassword) return Response.json({ error: "Одоогийн нууц үгээ оруулна уу." }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  let passwordForAuth = newPassword;
  if (isPin && user.loginKind) {
    const identifier = normalizeIdentifier(user.loginKind, user.loginKind === "phone" ? user.phone : user.email);
    const email = authEmail(user.loginKind, identifier);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pinPassword(identifier, currentPassword) });
    if (error) return Response.json({ error: "Одоогийн нэвтрэх PIN буруу байна." }, { status: 401 });
    passwordForAuth = pinPassword(identifier, newPassword);
  } else if (user.credentialKind === "password") {
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (error) return Response.json({ error: "Одоогийн нууц үг буруу байна." }, { status: 401 });
  }

  const { error } = await supabase.auth.updateUser({ password: passwordForAuth });
  if (error) return Response.json({ error: error.message || "Нууц үг шинэчилж чадсангүй." }, { status: 400 });
  return Response.json({ ok: true });
}
