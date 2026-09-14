import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/local-auth";
import { sendRecoveryCodeEmail } from "@/lib/auth/mailer";
import { createRecoveryCode, hashRecoveryCode, recoveryCookieOptions, recoveryEmailChallengeCookie, signRecoveryToken } from "@/lib/auth/recovery-token";
import { authEmail, normalizeIdentifier, pinPassword } from "@/lib/auth/pin-auth";
import { allowRecoveryAttempt } from "@/lib/auth/recovery-rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  const body = await request.json() as { email?: unknown; currentPin?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const currentPin = typeof body.currentPin === "string" ? body.currentPin : "";
  if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Зөв Gmail хаяг оруулна уу." }, { status: 400 });
  if (user.loginKind !== "phone" || !/^\d{4}$/.test(currentPin)) return Response.json({ error: "Одоогийн нэвтрэх PIN-ээ оруулна уу." }, { status: 400 });
  const phone = normalizeIdentifier("phone", user.phone);
  const { error: authError } = await (await createSupabaseServerClient()).auth.signInWithPassword({ email: authEmail("phone", phone), password: pinPassword(phone, currentPin) });
  if (authError) return Response.json({ error: "Одоогийн нэвтрэх PIN буруу байна." }, { status: 401 });
  if (!allowRecoveryAttempt(`link-email:${user.id}`, 3, 10 * 60 * 1000)) return Response.json({ error: "Олон удаа код авсан байна. 10 минутын дараа оролдоно уу." }, { status: 429 });

  const code = createRecoveryCode();
  try {
    await sendRecoveryCodeEmail(email, code);
  } catch (error) {
    console.error("Recovery email delivery failed:", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Код илгээж чадсангүй. Түр хүлээгээд дахин оролдоно уу." }, { status: 502 });
  }
  const token = signRecoveryToken({ purpose: "link-email", userId: user.id, email, codeHash: hashRecoveryCode(user.id, email, code), expiresAt: Date.now() + 10 * 60 * 1000 });
  (await cookies()).set(recoveryEmailChallengeCookie, token, recoveryCookieOptions());
  return Response.json({ ok: true });
}
