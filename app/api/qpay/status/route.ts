import { getCurrentUser } from "@/lib/auth/local-auth";
import { getPayment, getSubscription } from "@/lib/payments";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("order_id");
  if (!id) return Response.json({ error: "order_id дутуу." }, { status: 400 });
  const payment = getPayment(id);
  if (!payment || payment.userId !== user.id)
    return Response.json({ error: "Төлбөр олдсонгүй." }, { status: 404 });
  return Response.json({
    status: payment.status,
    subscription: getSubscription(user.id),
  });
}
