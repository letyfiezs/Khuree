import "server-only";
import { QPayClient } from "qpay-js";
import type { PlanId } from "./payments";

export const qpayPlanPrices: Record<PlanId, number> = {
  movie: 5900,
  series: 5900,
  vertical: 5900,
  adult: 5900,
  vip: 12900,
};

export function qpaySettings() {
  const required = [
    "QPAY_BASE_URL",
    "QPAY_USERNAME",
    "QPAY_PASSWORD",
    "QPAY_INVOICE_CODE",
    "QPAY_CALLBACK_URL",
  ] as const;
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    throw new Error(`QPay тохиргоо дутуу: ${missing.join(", ")}`);
  }
  const configuredDays = Number(process.env.QPAY_PLAN_DAYS ?? 30);
  const amountFor = (plan: PlanId) => {
    const envKey = `QPAY_${plan.toUpperCase()}_PRICE`;
    const configured = Number(process.env[envKey]);
    return Number.isFinite(configured) && configured > 0 ? Math.trunc(configured) : qpayPlanPrices[plan];
  };
  return {
    baseUrl: process.env.QPAY_BASE_URL!,
    username: process.env.QPAY_USERNAME!,
    password: process.env.QPAY_PASSWORD!,
    invoiceCode: process.env.QPAY_INVOICE_CODE!,
    callbackUrl: process.env.QPAY_CALLBACK_URL!,
    amount: Number(process.env.QPAY_PLAN_PRICE ?? 9900),
    amountFor,
    days: Number.isFinite(configuredDays) ? Math.max(1, Math.min(30, Math.trunc(configuredDays))) : 30,
    receiverCode: process.env.QPAY_RECEIVER_CODE ?? "KHUREE_WEB",
  };
}

export function qpayClient() {
  const config = qpaySettings();
  return new QPayClient(config);
}
