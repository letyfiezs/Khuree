import { getCurrentUser } from "@/lib/auth/local-auth";
import {
  completeInvoiceCreation,
  createPayment,
  failPayment,
  getPayment,
  paymentPlans,
  type PlanId,
} from "@/lib/payments";
import { qpayClient, qpaySettings } from "@/lib/qpay";
import { isQPayError } from "qpay-js";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.emailVerified)
    return Response.json(
      { error: "Баталгаажсан бүртгэлээр нэвтэрнэ үү." },
      { status: 401 },
    );

  let orderId: string | null = null;
  try {
    const body = await request.json().catch(() => ({})) as { plan?: unknown };
    const plan = body.plan as PlanId;
    if (!plan || !paymentPlans[plan]) return Response.json({ error: "Багц сонгоно уу." }, { status: 400 });
    const settings = qpaySettings();
    const amount = settings.amountFor(plan);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("QPay багцын үнэ буруу байна.");
    orderId = await createPayment(user.id, amount, plan);
    const separator = settings.callbackUrl.includes("?") ? "&" : "?";
    const invoice = await qpayClient().createSimpleInvoice({
      invoiceCode: settings.invoiceCode,
      senderInvoiceNo: orderId,
      invoiceReceiverCode: settings.receiverCode,
      invoiceDescription: `Хүрээ ${paymentPlans[plan].name} — ${settings.days} хоног`,
      amount,
      callbackUrl: `${settings.callbackUrl}${separator}order_id=${encodeURIComponent(orderId)}`,
    });
    await completeInvoiceCreation(orderId, invoice);
    const payment = await getPayment(orderId);
    return Response.json({ payment: payment ? { ...payment, qrImage: invoice.qrImage, shortUrl: invoice.qPayShortUrl, urls: invoice.urls } : null });
  } catch (error) {
    if (orderId) await failPayment(orderId).catch(() => undefined);
    console.error("QPay invoice error", error);
    let message = "QPay үйлчилгээтэй холбогдож чадсангүй. Түр хүлээгээд дахин оролдоно уу.";
    if (isQPayError(error)) {
      if (error.statusCode === 401) message = "QPay нэвтрэх тохиргоо хүчингүй байна. Админтай холбогдоно уу.";
      else if (error.statusCode === 403 || error.statusCode === 429) message = "QPay хүсэлт түр хязгаарлагдсан байна. Хэсэг хүлээгээд дахин оролдоно уу.";
    }
    return Response.json(
      { error: message },
      { status: 503 },
    );
  }
}
