import { QPayCheckout } from "@/components/qpay-checkout";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth/local-auth";
import { paymentPlans } from "@/lib/payments";
import { getPricingSettings } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function SubscribePage() {
  const user = await getCurrentUser();
  const pricing = await getPricingSettings();
  const days = pricing.planDays;
  return (
    <main>
      <SiteHeader />
      <section className="subscribe-page">
        <div className="subscribe-copy">
          <p className="section-kicker">ХҮРЭЭ ЭРХ</p>
          <h1>
            Кино ертөнцийг
            <br />
            хязгааргүй үз.
          </h1>
          <p>
            VIP багцаар бүх кино, олон ангит, босоо драма болон +18 контентыг нээгээрэй.
          </p>
          <ul>
            <li>3 төхөөрөмж дээр үзэх</li>
            <li>HD чанар</li>
            <li>Монгол хадмал</li>
          </ul>
          <div className="device-policy"><i>▣</i><div><b>Төхөөрөмжийн хязгаар</b><p>Нэг эрхээр хамгийн ихдээ <strong>3 төхөөрөмж</strong> бүртгүүлэх боломжтой.</p><span>Таны эрх зөвхөн хувийн хэрэглээнд зориулагдсан бөгөөд бусдад дамжуулах, хуваалцах боломжгүй. 3 төхөөрөмж бүртгэгдсэн бол шинэ төхөөрөмжөөс нэвтрэхийн тулд өмнөх төхөөрөмжийн аль нэгийг хасна.</span></div></div>
          {user?.canWatch && user.accessExpiresAt && (
            <div className="active-subscription">
              Үзэх эрх{" "}
              {new Date(user.accessExpiresAt).toLocaleDateString("mn-MN")}{" "}
              хүртэл идэвхтэй.
            </div>
          )}
        </div>
        <QPayCheckout authenticated={Boolean(user)} days={days} plans={[{ id: "vip", ...paymentPlans.vip, price: pricing.vip }]} />
      </section>
    </main>
  );
}
