import { cookies } from "next/headers";
import { matchesRecoveryCode, phoneRecoveryAuthorizedCookie, phoneRecoveryChallengeCookie, readRecoveryToken, recoveryCookieOptions, signRecoveryToken } from "@/lib/auth/recovery-token";
import { createSupabaseServerClient } from "@/lib/supabase";
import { allowRecoveryAttempt } from "@/lib/auth/recovery-rate-limit";

export async function POST(request: Request) {
  const body = await request.json() as { kind?: unknown; email?: unknown; token?: unknown };
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (body.kind === "phone") {
    const store = await cookies();
    const challenge = readRecoveryToken(store.get(phoneRecoveryChallengeCookie)?.value, "reset-phone");
    if (challenge && !allowRecoveryAttempt(`verify-phone:${challenge.userId}`, 8, 10 * 60 * 1000)) return Response.json({ error: "Олон удаа буруу код оруулсан байна. Дахин код авна уу." }, { status: 429 });
    if (!challenge?.phone || !/^\d{6}$/.test(token) || !matchesRecoveryCode(challenge.codeHash, challenge.userId, challenge.email, token)) {
      return Response.json({ error: "Код буруу эсвэл хугацаа нь дууссан байна." }, { status: 401 });
    }
    store.set(phoneRecoveryAuthorizedCookie, signRecoveryToken({ purpose: "reset-phone-authorized", userId: challenge.userId, email: challenge.email, phone: challenge.phone, expiresAt: Date.now() + 5 * 60 * 1000 }), recoveryCookieOptions(5 * 60));
    store.set(phoneRecoveryChallengeCookie, "", recoveryCookieOptions(0));
    return Response.json({ ok: true, credentialKind: "pin" });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(token)) return Response.json({ error: "Имэйл эсвэл 6 оронтой код буруу байна." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "recovery" });
  if (error || !data.user) return Response.json({ error: "Код буруу эсвэл хугацаа нь дууссан байна." }, { status: 401 });
  const loginKind = data.user.user_metadata?.login_kind;
  const credentialKind = loginKind === "phone" || loginKind === "email" ? "pin" : data.user.identities?.some((identity) => identity.provider === "email") ? "password" : "oauth";
  return Response.json({ ok: true, credentialKind });
}
