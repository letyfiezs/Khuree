import "server-only";
import { createSupabaseAdminClient } from "./supabase";
import type { PlanId } from "./payments";

export type PlanEntitlement = { enabled: boolean; expiresAt?: string; source: "manual" | "qpay"; updatedAt: string };

export async function setUserEntitlement(userId: string, input: { enabled: boolean; days?: number; source: "manual" | "qpay" }) {
  const client = createSupabaseAdminClient();
  const { data, error } = await client.auth.admin.getUserById(userId);
  if (error || !data.user) throw error ?? new Error("Хэрэглэгч олдсонгүй.");
  const current = data.user.app_metadata?.entitlement as { enabled?: boolean; expiresAt?: string } | undefined;
  const plans = data.user.app_metadata?.plan_entitlements && typeof data.user.app_metadata.plan_entitlements === "object"
    ? data.user.app_metadata.plan_entitlements as Partial<Record<PlanId, PlanEntitlement>>
    : {};
  const now = new Date();
  const expiresAt = input.enabled && input.days ? new Date(now.getTime() + input.days * 86400000).toISOString() : undefined;
  const entitlement = { enabled: input.enabled, expiresAt, source: input.source, updatedAt: now.toISOString() };
  const activePlanEntries = Object.entries(plans).filter(([, value]) => value?.enabled !== false && value?.expiresAt && value.expiresAt > now.toISOString());
  const adjustedPlans = input.enabled && activePlanEntries.length
    ? Object.fromEntries(Object.entries(plans).map(([key, value]) => activePlanEntries.some(([activeKey]) => activeKey === key) ? [key, { ...value, enabled: true, expiresAt, source: "manual", updatedAt: now.toISOString() }] : [key, value]))
    : plans;
  const nextEntitlement = input.enabled && activePlanEntries.length ? current : entitlement;
  const result = await client.auth.admin.updateUserById(userId, { app_metadata: { ...data.user.app_metadata, can_watch: input.enabled, entitlement: nextEntitlement, plan_entitlements: adjustedPlans } });
  if (result.error) throw result.error;
  return { enabled: input.enabled, expiresAt, activePlans: activePlanEntries.map(([plan]) => plan) };
}

export async function setUserPlanEntitlement(userId: string, plan: PlanId, input: { days: number; source: "qpay"; startsAt?: string | null }) {
  const client = createSupabaseAdminClient();
  const { data, error } = await client.auth.admin.getUserById(userId);
  if (error || !data.user) throw error ?? new Error("Хэрэглэгч олдсонгүй.");
  const plans = data.user.app_metadata?.plan_entitlements && typeof data.user.app_metadata.plan_entitlements === "object"
    ? data.user.app_metadata.plan_entitlements as Partial<Record<PlanId, PlanEntitlement>>
    : {};
  const now = new Date();
  const days = Math.max(1, Math.min(30, Math.trunc(input.days)));
  const suppliedStart = input.startsAt ? new Date(input.startsAt) : undefined;
  const startsAt = suppliedStart && Number.isFinite(suppliedStart.getTime()) ? suppliedStart : now;
  const entitlement: PlanEntitlement = { enabled: true, expiresAt: new Date(startsAt.getTime() + days * 86400000).toISOString(), source: input.source, updatedAt: now.toISOString() };
  const result = await client.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...data.user.app_metadata,
      can_watch: true,
      plan_entitlements: { ...plans, [plan]: entitlement },
    },
  });
  if (result.error) throw result.error;
  return entitlement;
}

export async function correctUserQPayPlan(userId: string, paymentId: string, plan: PlanId, days: number) {
  const client = createSupabaseAdminClient();
  const { data, error } = await client.auth.admin.getUserById(userId);
  if (error || !data.user) throw error ?? new Error("Хэрэглэгч олдсонгүй.");
  const payments = Array.isArray(data.user.app_metadata?.qpay_payments)
    ? data.user.app_metadata.qpay_payments as { id?: string; plan?: PlanId; status?: string; paidAt?: string | null; [key: string]: unknown }[]
    : [];
  const index = payments.findIndex((payment) => payment.id === paymentId && payment.status === "paid");
  if (index < 0) throw new Error("Төлөгдсөн QPay гүйлгээ олдсонгүй.");
  const payment = payments[index];
  const fromPlan = payment.plan;
  if (!fromPlan) throw new Error("QPay багцын мэдээлэл буруу байна.");
  const now = new Date();
  const plans = data.user.app_metadata?.plan_entitlements && typeof data.user.app_metadata.plan_entitlements === "object"
    ? data.user.app_metadata.plan_entitlements as Partial<Record<PlanId, PlanEntitlement>>
    : {};
  const currentExpiry = plans[fromPlan]?.expiresAt;
  const paidAt = payment.paidAt ? new Date(payment.paidAt) : now;
  const fallbackStart = Number.isFinite(paidAt.getTime()) ? paidAt : now;
  const expiresAt = currentExpiry && new Date(currentExpiry).getTime() > now.getTime()
    ? currentExpiry
    : new Date(fallbackStart.getTime() + Math.max(1, Math.min(30, Math.trunc(days))) * 86400000).toISOString();
  const nextPayments = payments.map((item, paymentIndex) => paymentIndex === index
    ? { ...item, plan, correctedFromPlan: fromPlan, correctedAt: now.toISOString() }
    : item);
  const anotherPaidOldPlan = nextPayments.some((item, paymentIndex) => paymentIndex !== index && item.status === "paid" && item.plan === fromPlan);
  const nextPlans: Partial<Record<PlanId, PlanEntitlement>> = {
    ...plans,
    [plan]: { enabled: true, expiresAt, source: "qpay", updatedAt: now.toISOString() },
  };
  if (fromPlan !== plan && plans[fromPlan]?.source === "qpay" && !anotherPaidOldPlan) {
    nextPlans[fromPlan] = { ...plans[fromPlan], enabled: false, updatedAt: now.toISOString() };
  }
  const result = await client.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...data.user.app_metadata,
      can_watch: true,
      qpay_payments: nextPayments.slice(-10),
      plan_entitlements: nextPlans,
    },
  });
  if (result.error) throw result.error;
  const activePlans = (Object.entries(nextPlans) as [PlanId, PlanEntitlement | undefined][])
    .filter(([, value]) => value?.enabled !== false && value?.expiresAt && value.expiresAt > now.toISOString())
    .map(([key]) => key);
  return { payment: nextPayments[index], expiresAt, activePlans };
}
