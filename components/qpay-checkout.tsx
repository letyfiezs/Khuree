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

export function QPayCheckout({ price, days }: { price: number; days: number }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createInvoice() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/qpay/invoice", { method: "POST" });
    const data = (await response.json()) as {
      payment?: Payment;
      error?: string;
    };
    setLoading(false);
    if (!response.ok || !data.payment)
      return setError(data.error ?? "Нэхэмжлэх үүссэнгүй.");
    setPayment(data.payment);
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
        <b>✓ VIP амжилттай идэвхжлээ</b>
        <span>Одоо бүх premium боломжийг ашиглаж болно.</span>
      </div>
    );
  }

  return (
    <div className="qpay-checkout">
      {!payment ? (
        <>
          <div className="plan-price">
            <b>{price.toLocaleString("mn-MN")}₮</b>
            <span>/ {days} хоног</span>
          </div>
          <button
            className="primary-button"
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
                {bank.name}
              </a>
            ))}
          </div>
          <p className="qpay-waiting">
            <span /> Төлбөр хүлээж байна…
          </p>
        </>
      )}
    </div>
  );
}
