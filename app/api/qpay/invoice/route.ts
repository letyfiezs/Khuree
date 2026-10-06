import { getCurrentUser } from "@/lib/auth/local-auth";
import {
  completeInvoiceCreation,
  createPayment,
  createRentalPayment,
  failPayment,
  getPayment,
  paymentPlans,
  type PlanId,
} from "@/lib/payments";
import { qpayClient, qpaySettings } from "@/lib/qpay";
import { isQPayError } from "qpay-js";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { getPricingSettings, planPrice } from "@/lib/pricing";

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
    const body = await request.json().catch(() => ({})) as { plan?: unknown; movieId?: unknown; seriesId?: unknown };
    const plan = body.plan as PlanId;
    const movieId = typeof body.movieId === "string" ? body.movieId : undefined;
    const seriesId = typeof body.seriesId === "string" ? body.seriesId : undefined;
    if ((!movieId && !seriesId) && plan !== "vip") return Response.json({ error: "Зөвхөн VIP багц авах боломжтой." }, { status: 400 });
    const settings = qpaySettings();
    const pricing = await getPricingSettings();
    let amount: number;
    let description: string;
    if (movieId || seriesId) {
      const table = movieId ? "movies" : "series";
      const id = movieId ?? seriesId!;
      const { data } = await createSupabaseAdminClient().from(table).select("id,title,is_free,rental_price").eq("id", id).maybeSingle();
      if (!data) return Response.json({ error: "Түрээслэх бүтээл олдсонгүй." }, { status: 404 });
      if (data.is_free) return Response.json({ error: "Энэ бүтээл үнэгүй байна." }, { status: 400 });
      amount = data.rental_price ?? pricing.defaultRentalPrice;
      const rentalPlan: PlanId = seriesId ? "series" : "movie";
      orderId = await createRentalPayment(user.id, amount, rentalPlan, { movieId, seriesId, title: data.title });
      description = `Хүрээ — ${data.title} (${pricing.rentalHours} цагийн түрээс)`;
    } else {
      amount = planPrice(pricing, plan);
      orderId = await createPayment(user.id, amount, plan);
      description = `Хүрээ ${paymentPlans[plan].name} — ${pricing.planDays} хоног`;
    }
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("QPay үнэ буруу байна.");
    const separator = settings.callbackUrl.includes("?") ? "&" : "?";
    const invoice = await qpayClient().createSimpleInvoice({
      invoiceCode: settings.invoiceCode,
      senderInvoiceNo: orderId,
      invoiceReceiverCode: settings.receiverCode,
      invoiceDescription: description,
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
