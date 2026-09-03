"use client";

import { useEffect, useState } from "react";

type Payment = {
  id: string;
  amount: number;
  status: "creating" | "pending" | "paid" | "failed";
  qrImage: string | null;
  shortUrl: string | null;
  urls: { name: string; description: string; logo: string; link: string }[];
};

type Plan = { id: "movie" | "series" | "vertical" | "adult" | "vip"; name: string; description: string; price: number };

export function QPayCheckout({ authenticated, days, plans }: { authenticated: boolean; days: number; plans: Plan[] }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan["id"]>("vip");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createInvoice() {
    if (!authenticated) {
      window.location.href = "/login?returnTo=%2Fsubscribe";
      return;
    }
    setLoading(true);
    setError("");
    const response = await fetch("/api/qpay/invoice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: selectedPlan }) });
    const data = (await response.json()) as {
      payment?: Payment;
      error?: string;
    };
    setLoading(false);
    if (!response.ok || !data.payment)
      return setError(data.error ?? "Нэхэмжлэх үүссэнгүй.");
    setPayment(data.payment);
  }

  async function checkPayment() {
    if (!payment) return;
    setLoading(true);
    setError("");
    const response = await fetch(`/api/qpay/status?order_id=${encodeURIComponent(payment.id)}`);
    const data = await response.json() as { status?: Payment["status"]; error?: string };
    setLoading(false);
    if (!response.ok) return setError(data.error ?? "Төлбөр шалгаж чадсангүй.");
    if (data.status) setPayment((current) => current ? { ...current, status: data.status! } : null);
    if (data.status === "pending") setError("Төлбөр хараахан баталгаажаагүй байна.");
  }

  useEffect(() => {
    if (!payment || payment.status !== "pending") return;
    const timer = window.setInterval(async () => {
      const response = await fetch(
        `/api/qpay/status?order_id=${encodeURIComponent(payment.id)}`,
      );
      if (!response.ok) return;
      const data = (await response.json()) as { status: Payment["status"] };
      if (data.status !== "pending")
        setPayment((current) =>
          current ? { ...current, status: data.status } : null,
        );
    }, 3000);
    return () => window.clearInterval(timer);
  }, [payment]);

  if (payment?.status === "paid") {
    return (
      <div className="qpay-success">
        <b>✓ Эрх амжилттай идэвхжлээ</b>
        <span>Сонгосон багцын контентыг одоо үзэх боломжтой.</span>
      </div>
    );
  }

  return (
    <div className="qpay-checkout">
      {!payment ? (
        <>
          <div className="qpay-plans">
            {plans.map((plan) => (
              <button key={plan.id} type="button" className={selectedPlan === plan.id ? "selected" : ""} onClick={() => setSelectedPlan(plan.id)}>
                <b>{plan.name}</b><span>{plan.description}</span><small>{plan.price.toLocaleString("mn-MN")}₮ / {days} хоног</small>
              </button>
            ))}
          </div>
          <div className="plan-price">
            <b>{(plans.find((plan) => plan.id === selectedPlan)?.price ?? 0).toLocaleString("mn-MN")}₮</b>
            <span>/ {days} хоног</span>
          </div>
          <button
            className="primary-button qpay-pay-button"
            onClick={createInvoice}
            disabled={loading}
          >
            {loading ? "QR үүсгэж байна…" : "QPay-аар төлөх"}
          </button>
          {error && <p className="qpay-error">{error}</p>}
        </>
      ) : (
        <>
          <p className="section-kicker">QPAY НЭХЭМЖЛЭХ</p>
          <h2>{payment.amount.toLocaleString("mn-MN")}₮</h2>
          {payment.qrImage && (
            // QPay returns a PNG as base64, not a public asset URL.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="qpay-qr"
              src={
                payment.qrImage.startsWith("data:")
                  ? payment.qrImage
                  : `data:image/png;base64,${payment.qrImage}`
              }
              alt="QPay QR код"
            />
          )}
          <p className="qpay-hint">QR кодоо банкны апп-аар уншуулна уу.</p>
          {payment.shortUrl && (
            <a className="qpay-mobile-link" href={payment.shortUrl}>
              Утсаар QPay нээх
            </a>
          )}
          <div className="qpay-banks">
            {payment.urls.map((bank) => (
              <a key={`${bank.name}-${bank.link}`} href={bank.link}>
                {bank.logo && <img src={bank.logo} alt="" />}
                <span>{bank.name}</span>
              </a>
            ))}
          </div>
          <button className="qpay-check-button" type="button" onClick={checkPayment} disabled={loading}>{loading ? "Шалгаж байна…" : "Төлбөр шалгах"}</button>
          {error && <p className="qpay-error">{error}</p>}
          <p className="qpay-waiting">
            <span /> Төлбөр хүлээж байна…
          </p>
        </>
      )}
    </div>
  );
}
