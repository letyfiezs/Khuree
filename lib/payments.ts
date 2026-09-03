import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createSupabaseAdminClient } from "./supabase";

export type PaymentStatus = "creating" | "pending" | "paid" | "failed";
export type PlanId = "movie" | "series" | "vertical" | "adult" | "vip";

export const paymentPlans: Record<PlanId, { name: string; description: string }> = {
  movie: { name: "Кино", description: "Бүх бүрэн хэмжээний кино" },
  series: { name: "Олон ангит", description: "Олон ангит кино, цувралууд" },
  vertical: { name: "Босоо драма", description: "Утсанд зориулсан босоо драмууд" },
  adult: { name: "+18", description: "Насанд хүрэгчдийн контент" },
  vip: { name: "VIP", description: "Бүх төрлийн контентыг нэг эрхээр" },
};

export type PaymentRecord = {
  id: string;
  userId: string;
  plan: PlanId;
  invoiceId: string | null;
  amount: number;
  status: PaymentStatus;
  qrImage: string | null;
  shortUrl: string | null;
  urls: { name: string; description: string; logo: string; link: string }[];
  createdAt: string;
  paidAt: string | null;
  paymentId?: string | null;
};

function signingSecret() {
  const secret = process.env.QPAY_ORDER_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("QPAY_ORDER_SECRET тохиргоо дутуу байна.");
  return secret;
}

function signature(value: string) {
  return createHmac("sha256", signingSecret()).update(value).digest("base64url").slice(0, 12);
}

function compactUserId(userId: string) {
  return Buffer.from(userId.replaceAll("-", ""), "hex").toString("base64url");
}

function expandUserId(value: string) {
  const hex = Buffer.from(value, "base64url").toString("hex");
  if (hex.length !== 32) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parseOrderId(id: string) {
  const [compactId, nonce, supplied] = id.split(".");
  if (!compactId || !nonce || !supplied) return null;
  const expected = signature(`${compactId}.${nonce}`);
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  const userId = expandUserId(compactId);
  return userId && a.length === b.length && timingSafeEqual(a, b) ? { userId } : null;
}

async function userPayments(userId: string) {
  const client = createSupabaseAdminClient();
  const { data, error } = await client.auth.admin.getUserById(userId);
  if (error || !data.user) throw error ?? new Error("Хэрэглэгч олдсонгүй.");
  const payments = Array.isArray(data.user.app_metadata?.qpay_payments)
    ? (data.user.app_metadata.qpay_payments as PaymentRecord[])
    : [];
  return { client, user: data.user, payments };
}

async function savePayments(userId: string, payments: PaymentRecord[]) {
  const { client, user } = await userPayments(userId);
  const result = await client.auth.admin.updateUserById(userId, {
    app_metadata: { ...user.app_metadata, qpay_payments: payments.slice(-10) },
  });
  if (result.error) throw result.error;
}

export async function createPayment(userId: string, amount: number, plan: PlanId) {
  const nonce = randomBytes(4).toString("hex");
  const value = `${compactUserId(userId)}.${nonce}`;
  const id = `${value}.${signature(value)}`;
  const { payments } = await userPayments(userId);
  payments.push({ id, userId, plan, invoiceId: null, amount, status: "creating", qrImage: null, shortUrl: null, urls: [], createdAt: new Date().toISOString(), paidAt: null });
  await savePayments(userId, payments);
  return id;
}

export async function updatePayment(id: string, patch: Partial<PaymentRecord>) {
  const parsed = parseOrderId(id);
  if (!parsed) throw new Error("Төлбөрийн дугаар буруу байна.");
  const { payments } = await userPayments(parsed.userId);
  const index = payments.findIndex((payment) => payment.id === id);
  if (index < 0) throw new Error("Төлбөрийн бүртгэл олдсонгүй.");
  payments[index] = { ...payments[index], ...patch, id, userId: parsed.userId };
  await savePayments(parsed.userId, payments);
  return payments[index];
}

export async function completeInvoiceCreation(id: string, invoice: { invoiceId: string; qrImage: string; qPayShortUrl: string; urls: PaymentRecord["urls"] }) {
  // QR image is large base64 data; keep it out of Supabase Auth metadata and
  // return it only in the invoice creation response.
  return updatePayment(id, { invoiceId: invoice.invoiceId, status: "pending", qrImage: null, shortUrl: invoice.qPayShortUrl, urls: [] });
}

export async function failPayment(id: string) { await updatePayment(id, { status: "failed" }); }

export async function getPayment(id: string) {
  const parsed = parseOrderId(id);
  if (!parsed) return null;
  const { payments } = await userPayments(parsed.userId);
  return payments.find((payment) => payment.id === id) ?? null;
}

export async function markPaymentPaid(id: string, paymentId: string) {
  const current = await getPayment(id);
  if (!current) throw new Error("Төлбөрийн бүртгэл олдсонгүй.");
  if (current.status === "paid") return current;
  return updatePayment(id, { status: "paid", paymentId, paidAt: new Date().toISOString() });
}
