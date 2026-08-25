import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

export type PaymentStatus = "creating" | "pending" | "paid" | "failed";

export type PaymentRecord = {
  id: string;
  userId: string;
  invoiceId: string | null;
  amount: number;
  status: PaymentStatus;
  qrImage: string | null;
  shortUrl: string | null;
  urls: { name: string; description: string; logo: string; link: string }[];
  createdAt: string;
  paidAt: string | null;
};

const storageRoot = path.resolve(
  process.cwd(),
  process.env.LOCAL_STORAGE_DIR ?? "storage",
);

function database() {
  mkdirSync(storageRoot, { recursive: true });
  const db = new DatabaseSync(path.join(storageRoot, "khuree.db"));
  db.exec(`
    CREATE TABLE IF NOT EXISTS qpay_payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      invoice_id TEXT UNIQUE,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'creating',
      qr_image TEXT,
      short_url TEXT,
      urls_json TEXT NOT NULL DEFAULT '[]',
      payment_id TEXT,
      created_at TEXT NOT NULL,
      paid_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_qpay_user_created
      ON qpay_payments(user_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS subscriptions (
      user_id TEXT PRIMARY KEY,
      expires_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

function toPayment(row: Record<string, unknown>): PaymentRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    invoiceId: row.invoice_id ? String(row.invoice_id) : null,
    amount: Number(row.amount),
    status: String(row.status) as PaymentStatus,
    qrImage: row.qr_image ? String(row.qr_image) : null,
    shortUrl: row.short_url ? String(row.short_url) : null,
    urls: JSON.parse(String(row.urls_json || "[]")),
    createdAt: String(row.created_at),
    paidAt: row.paid_at ? String(row.paid_at) : null,
  };
}

export function createPayment(userId: string, amount: number) {
  const db = database();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO qpay_payments(id,user_id,amount,status,created_at)
     VALUES(?,?,?,'creating',?)`,
  ).run(id, userId, amount, new Date().toISOString());
  db.close();
  return id;
}

export function completeInvoiceCreation(
  id: string,
  invoice: {
    invoiceId: string;
    qrImage: string;
    qPayShortUrl: string;
    urls: PaymentRecord["urls"];
  },
) {
  const db = database();
  db.prepare(
    `UPDATE qpay_payments SET invoice_id=?,status='pending',qr_image=?,short_url=?,urls_json=? WHERE id=?`,
  ).run(
    invoice.invoiceId,
    invoice.qrImage,
    invoice.qPayShortUrl,
    JSON.stringify(invoice.urls),
    id,
  );
  db.close();
}

export function failPayment(id: string) {
  const db = database();
  db.prepare(`UPDATE qpay_payments SET status='failed' WHERE id=?`).run(id);
  db.close();
}

export function getPayment(id: string) {
  const db = database();
  const row = db.prepare(`SELECT * FROM qpay_payments WHERE id=?`).get(id) as
    Record<string, unknown> | undefined;
  db.close();
  return row ? toPayment(row) : null;
}

export function markPaymentPaid(id: string, paymentId: string, days: number) {
  const db = database();
  const now = new Date();
  db.exec("BEGIN IMMEDIATE");
  try {
    const payment = db
      .prepare(`SELECT user_id,status FROM qpay_payments WHERE id=?`)
      .get(id) as { user_id: string; status: string } | undefined;
    if (!payment) throw new Error("Төлбөрийн бүртгэл олдсонгүй.");
    if (payment.status === "paid") {
      db.exec("COMMIT");
      return;
    }
    const current = db
      .prepare(`SELECT expires_at FROM subscriptions WHERE user_id=?`)
      .get(payment.user_id) as { expires_at: string } | undefined;
    const base =
      current && new Date(current.expires_at) > now
        ? new Date(current.expires_at)
        : now;
    base.setUTCDate(base.getUTCDate() + days);
    const paidAt = now.toISOString();
    db.prepare(
      `UPDATE qpay_payments SET status='paid',payment_id=?,paid_at=? WHERE id=?`,
    ).run(paymentId, paidAt, id);
    db.prepare(
      `INSERT INTO subscriptions(user_id,expires_at,updated_at) VALUES(?,?,?)
       ON CONFLICT(user_id) DO UPDATE SET expires_at=excluded.expires_at,updated_at=excluded.updated_at`,
    ).run(payment.user_id, base.toISOString(), paidAt);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

export function getSubscription(userId: string) {
  const db = database();
  const row = db
    .prepare(`SELECT expires_at FROM subscriptions WHERE user_id=?`)
    .get(userId) as { expires_at: string } | undefined;
  db.close();
  const expiresAt = row?.expires_at ?? null;
  return {
    expiresAt,
    active: Boolean(expiresAt && expiresAt > new Date().toISOString()),
  };
}
