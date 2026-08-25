import "server-only";
import { QPayClient } from "qpay-js";

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
  return {
    baseUrl: process.env.QPAY_BASE_URL!,
    username: process.env.QPAY_USERNAME!,
    password: process.env.QPAY_PASSWORD!,
    invoiceCode: process.env.QPAY_INVOICE_CODE!,
    callbackUrl: process.env.QPAY_CALLBACK_URL!,
    amount: Number(process.env.QPAY_PLAN_PRICE ?? 9900),
    days: Number(process.env.QPAY_PLAN_DAYS ?? 30),
    receiverCode: process.env.QPAY_RECEIVER_CODE ?? "KHUREE_WEB",
  };
}

export function qpayClient() {
  const config = qpaySettings();
  return new QPayClient(config);
}
