import { QPayCheckout } from "@/components/qpay-checkout";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth/local-auth";
import { getSubscription } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function SubscribePage() {
  const user = await requireUser("/subscribe");
  const subscription = getSubscription(user.id);
  const price = Number(process.env.QPAY_PLAN_PRICE ?? 9900);
  const days = Number(process.env.QPAY_PLAN_DAYS ?? 30);
  return (
    <main>
      <SiteHeader />
      <section className="subscribe-page">
        <div className="subscribe-copy">
          <p className="section-kicker">ХҮРЭЭ VIP</p>
          <h1>
            Кино ертөнцийг
            <br />
            хязгааргүй үз.
          </h1>
          <p>
            Premium кино, олон ангит болон шинэ контентыг нэг эрхээр үзээрэй.
          </p>
          <ul>
            <li>Бүх төхөөрөмж дээр үзэх</li>
            <li>HD чанар</li>
            <li>Монгол хадмал</li>
          </ul>
          {subscription.active && (
            <div className="active-subscription">
              VIP эрх{" "}
              {new Date(subscription.expiresAt!).toLocaleDateString("mn-MN")}{" "}
              хүртэл идэвхтэй.
            </div>
          )}
        </div>
        <QPayCheckout price={price} days={days} />
      </section>
    </main>
  );
}
