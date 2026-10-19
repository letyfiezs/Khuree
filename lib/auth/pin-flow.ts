import type { Session } from "@supabase/supabase-js";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase";
import { getCurrentUser, type LocalUser } from "@/lib/auth/local-auth";
import { authEmail, normalizeIdentifier, pinPassword } from "@/lib/auth/pin-auth";

export type PinKind = "phone" | "email";
export type PinAuthInput = { kind?: PinKind; identifier?: string; pin?: string; name?: string; returnTo?: string };
export type PinAuthSuccess = { ok: true; user: LocalUser | null; session: Session; returnTo: string };
export type PinAuthFailure = { error: string; status: number };

function safeReturnTo(returnTo?: string) {
  return returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
}

function isMobileClient(request: Request) {
  return (request.headers.get("x-khuree-client") ?? "").toLowerCase() === "mobile";
}

export function publicSession(session: Session) {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
  };
}

export function pinAuthJson(result: PinAuthSuccess | PinAuthFailure, request: Request) {
  if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
  if (!isMobileClient(request)) return Response.json({ ok: true, returnTo: result.returnTo });
  return Response.json({ ok: true, returnTo: result.returnTo, user: result.user, ...publicSession(result.session) });
}

export async function loginWithPin(input: PinAuthInput): Promise<PinAuthSuccess | PinAuthFailure> {
  if (!input.kind || !input.identifier || !input.pin) return { error: "Мэдээллээ бүрэн оруулна уу.", status: 400 };
  const identifier = normalizeIdentifier(input.kind, input.identifier);
  const email = authEmail(input.kind, identifier);
  const password = pinPassword(identifier, input.pin);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { error: "Дугаар/имэйл эсвэл PIN буруу байна.", status: 401 };
  }
  return { ok: true, user: await getCurrentUser(data.user), session: data.session, returnTo: safeReturnTo(input.returnTo) };
}

export async function signupWithPin(input: PinAuthInput): Promise<PinAuthSuccess | PinAuthFailure> {
  if (!input.kind || !input.identifier || !input.pin || !input.name?.trim()) return { error: "Мэдээллээ бүрэн оруулна уу.", status: 400 };
  const identifier = normalizeIdentifier(input.kind, input.identifier);
  const email = authEmail(input.kind, identifier);
  const password = pinPassword(identifier, input.pin);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: input.name.trim(), phone: input.kind === "phone" ? identifier : null, login_kind: input.kind },
    app_metadata: { can_watch: false, entitlement: { enabled: false, source: "registration", updatedAt: new Date().toISOString() } },
  });
  if (error || !data.user) {
    return { error: error?.message.toLowerCase().includes("registered") ? "Энэ дугаар эсвэл имэйл бүртгэлтэй байна." : "Бүртгэл үүсгэж чадсангүй.", status: 409 };
  }
  await admin.from("profiles").upsert({ id: data.user.id, display_name: input.name.trim(), role: "user" });
  const supabase = await createSupabaseServerClient();
  const signed = await supabase.auth.signInWithPassword({ email, password });
  if (signed.error || !signed.data.user || !signed.data.session) return { error: "Бүртгэл үүссэн ч нэвтэрч чадсангүй.", status: 500 };
  return { ok: true, user: await getCurrentUser(signed.data.user), session: signed.data.session, returnTo: safeReturnTo(input.returnTo) };
}
