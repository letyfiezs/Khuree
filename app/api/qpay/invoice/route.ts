import { getCurrentUser } from "@/lib/auth/local-auth";
import {
  completeInvoiceCreation,
  createPayment,
  failPayment,
  getPayment,
} from "@/lib/payments";
import { qpayClient, qpaySettings } from "@/lib/qpay";

export const runtime = "nodejs";

export async function POST() {
  const user = await getCurrentUser();
  if (!user?.emailVerified)
    return Response.json(
      { error: "Баталгаажсан бүртгэлээр нэвтэрнэ үү." },
      { status: 401 },
    );

  let orderId: string | null = null;
  try {
    const settings = qpaySettings();
    if (!Number.isFinite(settings.amount) || settings.amount <= 0)
      throw new Error("QPAY_PLAN_PRICE буруу байна.");
    orderId = createPayment(user.id, settings.amount);
    const separator = settings.callbackUrl.includes("?") ? "&" : "?";
    const invoice = await qpayClient().createSimpleInvoice({
      invoiceCode: settings.invoiceCode,
      senderInvoiceNo: orderId,
      invoiceReceiverCode: settings.receiverCode,
      invoiceDescription: `Хүрээ VIP — ${settings.days} хоног`,
      amount: settings.amount,
      callbackUrl: `${settings.callbackUrl}${separator}order_id=${encodeURIComponent(orderId)}`,
    });
    completeInvoiceCreation(orderId, invoice);
    return Response.json({ payment: getPayment(orderId) });
  } catch (error) {
    if (orderId) failPayment(orderId);
    console.error("QPay invoice error", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "QPay нэхэмжлэх үүссэнгүй.",
      },
      { status: 503 },
    );
  }
}
