import { getCurrentUser } from "@/lib/auth/local-auth";
import { getPayment, markPaymentPaid } from "@/lib/payments";
import { qpayClient } from "@/lib/qpay";
import { setUserPlanEntitlement } from "@/lib/user-entitlements";
import { activateRental } from "@/lib/content-access";
import { getPricingSettings } from "@/lib/pricing";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("order_id");
  const verifyWithQPay = new URL(request.url).searchParams.get("verify") === "1";
  if (!id) return Response.json({ error: "order_id дутуу." }, { status: 400 });
  const payment = await getPayment(id);
  if (!payment || payment.userId !== user.id)
    return Response.json({ error: "Төлбөр олдсонгүй." }, { status: 404 });
  if (payment.status === "paid") {
    const pricing = await getPricingSettings();
    if (payment.purchaseType === "rental" && payment.rental) await activateRental(payment.userId, payment.id, payment.amount, payment.rental, pricing.rentalHours, payment.paidAt);
    else await setUserPlanEntitlement(payment.userId, payment.plan, { days: pricing.planDays, source: "qpay", startsAt: payment.paidAt });
    return Response.json({ status: "paid", plan: payment.plan });
  }
  if (verifyWithQPay && payment.status === "pending" && payment.invoiceId) {
    try {
      const check = await qpayClient().checkPayment({ objectType: "INVOICE", objectId: payment.invoiceId, offset: { pageNumber: 1, pageLimit: 100 } });
      const paidRows = check.rows.filter((row) => row.paymentStatus === "PAID");
      const paidAmount = paidRows.reduce((sum, row) => sum + Number(row.paymentAmount || 0), 0);
      if (paidRows.length && paidAmount >= payment.amount) {
        const paid = await markPaymentPaid(id, paidRows[0].paymentId);
        const pricing = await getPricingSettings();
        if (paid.purchaseType === "rental" && paid.rental) await activateRental(paid.userId, paid.id, paid.amount, paid.rental, pricing.rentalHours, paid.paidAt);
        else await setUserPlanEntitlement(paid.userId, paid.plan, { days: pricing.planDays, source: "qpay", startsAt: paid.paidAt });
        return Response.json({ status: paid.status, plan: paid.plan });
      }
    } catch (error) {
      console.error("QPay manual status check error", error);
      return Response.json({ error: "QPay төлбөрийн төлөв шалгаж чадсангүй." }, { status: 502 });
    }
  }
  return Response.json({ status: payment.status, plan: payment.plan });
}
