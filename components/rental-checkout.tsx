"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Payment = { id: string; amount: number; status: "creating" | "pending" | "paid" | "failed"; qrImage: string | null; shortUrl: string | null };

export function RentalCheckout({ movieId, seriesId, title, price, hours, vipPrice, vipDays }: { movieId?: string; seriesId?: string; title: string; price: number; hours: number; vipPrice: number; vipDays: number }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function createInvoice() {
    setLoading(true); setError("");
    const response = await fetch("/api/qpay/invoice", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ movieId, seriesId }) });
    const data = await response.json() as { payment?: Payment; error?: string };
    setLoading(false);
    if (!response.ok || !data.payment) return setError(data.error ?? "Нэхэмжлэх үүссэнгүй.");
    setPayment(data.payment);
  }
  const checkPayment = useCallback(async (verify = true) => {
    if (!payment) return;
    const response = await fetch(`/api/qpay/status?order_id=${encodeURIComponent(payment.id)}${verify ? "&verify=1" : ""}`);
    if (!response.ok) return;
    const data = await response.json() as { status: Payment["status"] };
    setPayment((current) => current ? { ...current, status: data.status } : null);
    if (data.status === "paid") window.location.reload();
  }, [payment]);
  useEffect(() => {
    if (payment?.status !== "pending") return;
    const timer = window.setInterval(() => void checkPayment(false), 8000);
    return () => window.clearInterval(timer);
  }, [payment, checkPayment]);
  return (
    <div className="rental-checkout">
      <div className="rental-offers">
        <div className="rental-offer"><span>{hours} цагийн түрээс</span><strong>{price.toLocaleString("mn-MN")}₮</strong><small>{title}</small></div>
        <Link className="vip-rental-offer" href="/subscribe"><span>БҮХ КИНО VIP</span><strong>{vipPrice.toLocaleString("mn-MN")}₮</strong><small>{vipDays} хоног · Хязгааргүй үзэх</small></Link>
      </div>
      {!payment && <button type="button" className="primary-button" disabled={loading} onClick={() => void createInvoice()}>{loading ? "QR үүсгэж байна…" : "QPay-аар түрээслэх"}</button>}
      {payment?.status === "pending" && <div className="rental-qr">{payment.qrImage && /* QPay returns an inline base64 PNG. */ <img src={payment.qrImage.startsWith("data:") ? payment.qrImage : `data:image/png;base64,${payment.qrImage}`} alt="QPay QR" /> /* eslint-disable-line @next/next/no-img-element */}<button type="button" onClick={() => void checkPayment()}>{loading ? "Шалгаж байна…" : "Төлбөр шалгах"}</button>{payment.shortUrl && <a href={payment.shortUrl}>QPay апп нээх</a>}</div>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
