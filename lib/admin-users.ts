import "server-only";
import { createSupabaseAdminClient } from "./supabase";
import type { RegisteredDevice } from "./auth/local-auth";

export type AdminUserItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  loginKind: "phone" | "email";
  credentialKind: "pin" | "password" | "oauth";
  role: "user" | "admin";
  watchPermissions: { movie: boolean; series: boolean; vertical: boolean; adult: boolean };
  createdAt: string;
  lastSignInAt?: string;
  lastSeenAt?: string;
  watching?: { id: string; title: string; kind: "movie" | "series" };
  accessEnabled: boolean;
  vipEnabled: boolean;
  accessExpiresAt?: string;
  activePlans: string[];
  devices: RegisteredDevice[];
  qpayPaidAmount: number;
  qpayPaidCount: number;
  qpayPaidPlans: string[];
  qpayLastPaidAt?: string;
  qpayPayments: { id: string; plan: "movie" | "series" | "vertical" | "adult" | "vip"; amount: number; paidAt?: string; correctedFromPlan?: string }[];
};

type ProfileRow = { id: string; display_name: string | null; role: "user" | "admin" | null };

const PROFILE_QUERY_BATCH_SIZE = 100;

export async function listAdminUsers(): Promise<AdminUserItem[]> {
  const client = createSupabaseAdminClient();
  const authUsers = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    authUsers.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const ids = authUsers.map((user) => user.id);
  const profiles: ProfileRow[] = [];
  for (let index = 0; index < ids.length; index += PROFILE_QUERY_BATCH_SIZE) {
    const { data, error } = await client
      .from("profiles")
      .select("id,display_name,role")
      .in("id", ids.slice(index, index + PROFILE_QUERY_BATCH_SIZE));
    if (error) throw error;
    profiles.push(...(data as ProfileRow[]));
  }
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  return authUsers.map((user) => {
    const profile = profileById.get(user.id);
    const loginKind = user.user_metadata?.login_kind;
    const phone = user.phone || user.user_metadata?.phone || "";
    const email = loginKind === "phone" || user.email?.endsWith("@khuree.local") ? "" : user.email || "";
    const entitlement = user.app_metadata?.entitlement as { enabled?: boolean; expiresAt?: string } | undefined;
    const now = new Date().toISOString();
    const legacyActive = entitlement ? entitlement.enabled !== false && (!entitlement.expiresAt || entitlement.expiresAt > now) : false;
    const plans = user.app_metadata?.plan_entitlements && typeof user.app_metadata.plan_entitlements === "object" ? user.app_metadata.plan_entitlements as Partial<Record<"movie" | "series" | "vertical" | "adult" | "vip", { enabled?: boolean; expiresAt?: string }>> : {};
    const planActive = (plan: "movie" | "series" | "vertical" | "adult" | "vip") => Boolean(plans[plan]?.enabled !== false && plans[plan]?.expiresAt && plans[plan]!.expiresAt! > now);
    const activePlanExpiries = Object.values(plans).filter((plan) => plan?.enabled !== false && plan?.expiresAt && plan.expiresAt > now).map((plan) => plan!.expiresAt!);
    const accessEnabled = user.app_metadata?.can_watch !== false && (legacyActive || activePlanExpiries.length > 0);
    const vipEnabled = user.app_metadata?.can_watch !== false && (legacyActive || planActive("vip"));
    const permissions = user.app_metadata?.watch_permissions as Partial<AdminUserItem["watchPermissions"]> | undefined;
    const qpayPayments = Array.isArray(user.app_metadata?.qpay_payments) ? user.app_metadata.qpay_payments as { id?: string; plan?: string; amount?: number; status?: string; paidAt?: string | null; correctedFromPlan?: string; purchaseType?: string }[] : [];
    const paidQpayPayments = qpayPayments.filter((payment) => payment.status === "paid");
    const paidPlanPayments = paidQpayPayments.filter((payment) => payment.purchaseType !== "rental");
    return {
      id: user.id,
      name: profile?.display_name || user.user_metadata?.name || phone || email || "Хэрэглэгч",
      email,
      phone,
      loginKind: loginKind === "phone" || user.email?.endsWith("@khuree.local") ? "phone" : "email",
      credentialKind: loginKind === "phone" || loginKind === "email" || user.email?.endsWith("@khuree.local") ? "pin" : user.identities?.some((identity) => identity.provider === "email") ? "password" : "oauth",
      role: profile?.role === "admin" ? "admin" : "user",
      watchPermissions: {
        movie: (permissions?.movie ?? true) && accessEnabled,
        series: (permissions?.series ?? true) && accessEnabled,
        vertical: (permissions?.vertical ?? true) && accessEnabled,
        adult: (permissions?.adult ?? true) && accessEnabled,
      },
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
      lastSeenAt: typeof user.user_metadata?.presence_last_seen_at === "string" ? user.user_metadata.presence_last_seen_at : undefined,
      accessEnabled,
      vipEnabled,
      accessExpiresAt: [entitlement?.expiresAt, ...activePlanExpiries].filter(Boolean).sort().at(-1),
      activePlans: (["movie", "series", "vertical", "adult", "vip"] as const).filter(planActive),
      devices: Array.isArray(user.app_metadata?.devices) ? user.app_metadata.devices as RegisteredDevice[] : [],
      qpayPaidAmount: paidQpayPayments.reduce((sum, payment) => sum + (Number.isFinite(Number(payment.amount)) ? Number(payment.amount) : 0), 0),
      qpayPaidCount: paidQpayPayments.length,
      qpayPaidPlans: [...new Set(paidPlanPayments.map((payment) => payment.plan).filter((plan): plan is string => Boolean(plan)))],
      qpayLastPaidAt: paidQpayPayments.map((payment) => payment.paidAt).filter((value): value is string => Boolean(value)).sort().at(-1),
      qpayPayments: paidPlanPayments
        .filter((payment): payment is { id: string; plan: "movie" | "series" | "vertical" | "adult" | "vip"; amount?: number; paidAt?: string | null; correctedFromPlan?: string } => typeof payment.id === "string" && ["movie", "series", "vertical", "adult", "vip"].includes(String(payment.plan)))
        .map((payment) => ({ id: payment.id, plan: payment.plan, amount: Number.isFinite(Number(payment.amount)) ? Number(payment.amount) : 0, paidAt: payment.paidAt ?? undefined, correctedFromPlan: payment.correctedFromPlan })),
    };
  });
}
