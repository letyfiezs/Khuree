import { getPayment, markPaymentPaid } from "@/lib/payments";
import { qpayClient, qpaySettings } from "@/lib/qpay";

export const runtime = "nodejs";

async function handle(request: Request) {
  const orderId = new URL(request.url).searchParams.get("order_id");
  if (!orderId)
    return Response.json({ error: "order_id дутуу." }, { status: 400 });
  const payment = getPayment(orderId);
  if (!payment?.invoiceId)
    return Response.json({ error: "Нэхэмжлэх олдсонгүй." }, { status: 404 });
  if (payment.status === "paid") return Response.json({ ok: true });

  try {
    const check = await qpayClient().checkPayment({
      objectType: "INVOICE",
      objectId: payment.invoiceId,
      offset: { pageNumber: 1, pageLimit: 100 },
    });
    const paidRows = check.rows.filter((row) => row.paymentStatus === "PAID");
    const paidAmount = paidRows.reduce(
      (sum, row) => sum + Number(row.paymentAmount || 0),
      0,
    );
    if (!paidRows.length || paidAmount < payment.amount)
      return Response.json({ ok: false, status: "pending" }, { status: 202 });
    markPaymentPaid(orderId, paidRows[0].paymentId, qpaySettings().days);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("QPay callback verification error", error);
    return Response.json({ error: "Төлбөр баталгаажсангүй." }, { status: 502 });
  }
}

export const GET = handle;
export const POST = handle;
