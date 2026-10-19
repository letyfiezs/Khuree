import { getCurrentUser } from "@/lib/auth/local-auth";
import { paymentPlans, type PlanId } from "@/lib/payments";
import { qpayPlanPrices, qpaySettings } from "@/lib/qpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  let days = 30;
  try {
    days = qpaySettings().days;
  } catch {
    const configuredDays = Number(process.env.QPAY_PLAN_DAYS ?? 30);
    days = Number.isFinite(configuredDays) ? Math.max(1, Math.min(30, Math.trunc(configuredDays))) : 30;
  }
  return Response.json({
    authenticated: Boolean(user),
    canWatch: Boolean(user?.canWatch),
    accessExpiresAt: user?.accessExpiresAt ?? null,
    watchPermissions: user?.watchPermissions ?? null,
    days,
    plans: (Object.entries(paymentPlans) as [PlanId, (typeof paymentPlans)[PlanId]][]).map(([id, plan]) => ({
      id,
      ...plan,
      price: qpayPlanPrices[id],
    })),
  });
}
