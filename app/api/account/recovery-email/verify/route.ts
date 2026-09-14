import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/local-auth";
import { matchesRecoveryCode, readRecoveryToken, recoveryCookieOptions, recoveryEmailChallengeCookie } from "@/lib/auth/recovery-token";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { allowRecoveryAttempt } from "@/lib/auth/recovery-rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  const body = await request.json() as { code?: unknown };
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const store = await cookies();
  const challenge = readRecoveryToken(store.get(recoveryEmailChallengeCookie)?.value, "link-email");
  if (challenge && !allowRecoveryAttempt(`verify-link-email:${challenge.userId}`, 8, 10 * 60 * 1000)) return Response.json({ error: "Олон удаа буруу код оруулсан байна. Дахин код авна уу." }, { status: 429 });
  if (!challenge || challenge.userId !== user.id || !/^\d{6}$/.test(code) || !matchesRecoveryCode(challenge.codeHash, user.id, challenge.email, code)) {
    return Response.json({ error: "Код буруу эсвэл хугацаа нь дууссан байна." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const current = await admin.auth.admin.getUserById(user.id);
  if (current.error || !current.data.user) return Response.json({ error: "Бүртгэл олдсонгүй." }, { status: 404 });
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...current.data.user.app_metadata, recovery_email: challenge.email, recovery_email_verified_at: new Date().toISOString() },
  });
  if (error) return Response.json({ error: "Сэргээх Gmail хадгалж чадсангүй." }, { status: 500 });
  store.set(recoveryEmailChallengeCookie, "", recoveryCookieOptions(0));
  return Response.json({ ok: true, email: challenge.email });
}
