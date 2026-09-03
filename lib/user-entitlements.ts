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
