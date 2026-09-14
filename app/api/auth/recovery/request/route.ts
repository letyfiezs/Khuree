import { cookies } from "next/headers";
import { authEmail, normalizeIdentifier } from "@/lib/auth/pin-auth";
import { sendRecoveryCodeEmail } from "@/lib/auth/mailer";
import { createRecoveryCode, hashRecoveryCode, phoneRecoveryChallengeCookie, recoveryCookieOptions, signRecoveryToken } from "@/lib/auth/recovery-token";
import { allowRecoveryAttempt } from "@/lib/auth/recovery-rate-limit";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase";

const emailPattern = /^\S+@\S+\.\S+$/;

export async function POST(request: Request) {
  const body = await request.json() as { kind?: unknown; email?: unknown; identifier?: unknown; recoveryEmail?: unknown };
  if (body.kind === "phone") {
    let phone = "";
    try {
      phone = normalizeIdentifier("phone", typeof body.identifier === "string" ? body.identifier : "");
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Утасны дугаар буруу байна." }, { status: 400 });
    }
    const recoveryEmail = typeof body.recoveryEmail === "string" ? body.recoveryEmail.trim().toLowerCase() : "";
    if (!emailPattern.test(recoveryEmail)) return Response.json({ error: "Сэргээх Gmail хаягаа зөв оруулна уу." }, { status: 400 });
    if (!allowRecoveryAttempt(`request-phone:${phone}:${recoveryEmail}`, 3, 10 * 60 * 1000)) return Response.json({ error: "Олон удаа код авсан байна. 10 минутын дараа оролдоно уу." }, { status: 429 });
    try {
      const admin = createSupabaseAdminClient();
      const expectedEmail = authEmail("phone", phone);
      let target: Awaited<ReturnType<typeof admin.auth.admin.listUsers>>["data"]["users"][number] | undefined;
      for (let page = 1; page <= 10 && !target; page += 1) {
        const result = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (result.error) throw result.error;
        target = result.data.users.find((user) => user.email === expectedEmail);
        if (result.data.users.length < 200) break;
      }
      const linkedEmail = target?.app_metadata?.recovery_email_verified_at && typeof target.app_metadata?.recovery_email === "string" ? target.app_metadata.recovery_email.toLowerCase() : "";
      if (target && linkedEmail === recoveryEmail) {
        const code = createRecoveryCode();
        await sendRecoveryCodeEmail(recoveryEmail, code);
        const token = signRecoveryToken({ purpose: "reset-phone", userId: target.id, email: recoveryEmail, phone, codeHash: hashRecoveryCode(target.id, recoveryEmail, code), expiresAt: Date.now() + 10 * 60 * 1000 });
        (await cookies()).set(phoneRecoveryChallengeCookie, token, recoveryCookieOptions());
      }
    } catch (error) {
      console.error("Phone recovery request failed:", error instanceof Error ? error.message : "unknown error");
    }
    return Response.json({ ok: true, message: "Хэрэв мэдээлэл таарч байвал сэргээх код Gmail рүү илгээгдэнэ." });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : typeof body.identifier === "string" ? body.identifier.trim().toLowerCase() : "";
  if (!emailPattern.test(email)) return Response.json({ error: "Зөв имэйл хаяг оруулна уу." }, { status: 400 });
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin}/login`,
    });
    if (error) console.error("Password recovery request failed:", error.message);
  } catch (error) {
    console.error("Password recovery request failed:", error instanceof Error ? error.message : "unknown error");
  }
  return Response.json({ ok: true, message: "Хэрэв энэ и-мэйл бүртгэлтэй бол баталгаажуулах код илгээгдэнэ." });
}
