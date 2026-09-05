import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase";
import { authEmail, normalizeIdentifier, pinPassword } from "@/lib/auth/pin-auth";

export type WatchSection = "movie" | "series" | "vertical" | "adult";
export type RegisteredDevice = { id: string; name: string; createdAt: string; lastSeenAt: string; fingerprint?: string };
export type LocalUser = { id: string; name: string; email: string; phone: string; loginKind?: "phone" | "email"; role: "user" | "admin"; emailVerified: boolean; adultEnabled: boolean; hasParentalPin: boolean; adultUnlocked: boolean; canWatch: boolean; accessExpiresAt?: string; watchPermissions: Record<WatchSection, boolean>; devices: RegisteredDevice[]; deviceLimit: number | null };
export const sessionCookieName = "sb-access-token";
export const adminSessionCookieName = "khuree-admin-session";

function adminPassword() { return process.env.ADMIN_PASSWORD ?? ""; }
function adminSessionSecret() { return process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || adminPassword(); }
function adminSessionToken() {
  const secret = adminSessionSecret();
  return secret ? createHmac("sha256", secret).update(`khuree-admin:${adminPassword()}`).digest("hex") : "";
}
export async function hasAdminPasswordSession() {
  const current = (await cookies()).get(adminSessionCookieName)?.value ?? "";
  const expected = adminSessionToken();
  return Boolean(current && expected && safeEqual(current, expected));
}
export function verifyAdminPassword(password: string) { const expected = adminPassword(); return Boolean(expected && safeEqual(password, expected)); }
export function createAdminSessionValue() { return adminSessionToken(); }

function pinHash(pin: string) { return createHash("sha256").update(pin).digest("hex"); }
function safeEqual(a: string, b: string) { const aa = Buffer.from(a), bb = Buffer.from(b); return aa.length === bb.length && timingSafeEqual(aa, bb); }

export async function getCurrentUser(): Promise<LocalUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("display_name,role,adult_enabled,parental_pin_hash,adult_unlocked_until").eq("id", user.id).maybeSingle();
  const entitlement = user.app_metadata?.entitlement as { enabled?: boolean; expiresAt?: string } | undefined;
  const entitlementActive = entitlement ? entitlement.enabled !== false && (!entitlement.expiresAt || entitlement.expiresAt > new Date().toISOString()) : false;
  const now = new Date().toISOString();
  const planEntitlements = user.app_metadata?.plan_entitlements && typeof user.app_metadata.plan_entitlements === "object" ? user.app_metadata.plan_entitlements as Partial<Record<WatchSection | "vip", { enabled?: boolean; expiresAt?: string }>> : {};
  const planActive = (plan: WatchSection | "vip") => Boolean(planEntitlements[plan]?.enabled !== false && planEntitlements[plan]?.expiresAt && planEntitlements[plan]!.expiresAt! > now);
  const anyPlanActive = (["movie", "series", "vertical", "adult", "vip"] as const).some(planActive);
  const defaultCanWatch = user.app_metadata?.can_watch !== false && (entitlementActive || anyPlanActive);
  const permissions = user.app_metadata?.watch_permissions as Partial<Record<WatchSection, boolean>> | undefined;
  const devices = Array.isArray(user.app_metadata?.devices) ? user.app_metadata.devices as RegisteredDevice[] : [];
  return {
    id: user.id,
    name: profile?.display_name || user.user_metadata?.name || user.phone || user.email?.split("@")[0] || "User",
    email: user.email || "",
    phone: user.phone || user.user_metadata?.phone || "",
    loginKind: user.user_metadata?.login_kind === "phone" || user.user_metadata?.login_kind === "email" ? user.user_metadata.login_kind : undefined,
    role: profile?.role === "admin" ? "admin" : "user",
    emailVerified: Boolean(user.phone_confirmed_at || user.email_confirmed_at),
    adultEnabled: Boolean(profile?.adult_enabled),
    hasParentalPin: Boolean(profile?.parental_pin_hash),
    adultUnlocked: Boolean(profile?.adult_unlocked_until && profile.adult_unlocked_until > new Date().toISOString()),
    canWatch: defaultCanWatch,
    accessExpiresAt: entitlement?.expiresAt,
    watchPermissions: {
      movie: (permissions?.movie ?? true) && (planActive("vip") || planActive("movie") || entitlementActive),
      series: (permissions?.series ?? true) && (planActive("vip") || planActive("series") || entitlementActive),
      vertical: (permissions?.vertical ?? true) && (planActive("vip") || planActive("vertical") || entitlementActive),
      adult: (permissions?.adult ?? true) && (planActive("vip") || planActive("adult") || entitlementActive),
    },
    devices,
    deviceLimit: user.app_metadata?.unlimited_devices === true ? null : 3,
  };
}
export async function requireUser(returnTo = "/movies") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  return user;
}
export async function requireAdmin() {
  if (await hasAdminPasswordSession()) {
    return { id: "admin-password", name: "Хүрээ админ", email: "", phone: "", role: "admin", emailVerified: true, adultEnabled: true, hasParentalPin: false, adultUnlocked: true, canWatch: true, watchPermissions: { movie: true, series: true, vertical: true, adult: true }, devices: [], deviceLimit: null } satisfies LocalUser;
  }
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "admin") redirect("/admin/login");
  return user;
}
export async function updateAccount(userId: string, input: { name: string; currentPassword: string; adultEnabled: boolean; parentalPin?: string }) {
  const client = await createSupabaseServerClient();
  const current = await getCurrentUser();
  if (!current || current.id !== userId) throw new Error("Нэвтрэх шаардлагатай.");
  let email = current.email;
  let password = input.currentPassword;
  if (current.loginKind) {
    const identifier = normalizeIdentifier(current.loginKind, current.loginKind === "phone" ? current.phone : current.email);
    email = authEmail(current.loginKind, identifier);
    password = pinPassword(identifier, input.currentPassword);
  }
  const { error: authError } = await client.auth.signInWithPassword({ email, password });
  if (authError) throw new Error(current.loginKind ? "Одоогийн нэвтрэх PIN буруу байна." : "Одоогийн нууц үг буруу байна.");
  const patch: Record<string, unknown> = { display_name: input.name.trim(), adult_enabled: input.adultEnabled };
  if (input.parentalPin) patch.parental_pin_hash = pinHash(input.parentalPin);
  const { error } = await createSupabaseAdminClient().from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}
export async function unlockAdultSession(_token: string | undefined, userId: string, pin: string) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("profiles").select("parental_pin_hash,adult_enabled").eq("id", userId).single();
  if (!data?.adult_enabled || !data.parental_pin_hash || !safeEqual(pinHash(pin), data.parental_pin_hash)) return false;
  const { error } = await admin
    .from("profiles")
    .update({ adult_unlocked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString() })
    .eq("id", userId);
  return !error;
}
export async function requireAdultAccess(user: LocalUser, returnTo: string) {
  if (!user.adultEnabled || !user.adultUnlocked) redirect(`/adult?returnTo=${encodeURIComponent(returnTo)}`);
}
export function requireWatchAccess(user: LocalUser, section: WatchSection) {
  if ((!user.canWatch || !user.watchPermissions[section]) && user.role !== "admin") redirect("/subscribe");
}
export async function requireDeviceAccess(user: LocalUser, returnTo: string) {
  if (user.role === "admin") return;
  const deviceId = (await cookies()).get("khuree-device-id")?.value;
  if (!deviceId || !user.devices.some((device) => device.id === deviceId)) redirect(`/account?deviceSetup=1&returnTo=${encodeURIComponent(returnTo)}`);
}
