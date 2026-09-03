import nodemailer from "nodemailer";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string,
) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = `${origin}/api/auth/verify?token=${encodeURIComponent(token)}`;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
      to: email,
      subject: "Хүрээ — Имэйл хаягаа баталгаажуулна уу",
      text: `Сайн байна уу, ${name}. Имэйлээ баталгаажуулах: ${url}`,
      html: `<div style="font-family:Arial;background:#090909;color:#fff;padding:32px"><h1 style="color:#e50914">ХҮРЭЭ</h1><p>Сайн байна уу, ${name}.</p><p>Бүртгэлээ идэвхжүүлэхийн тулд доорх товчийг дарна уу.</p><a href="${url}" style="display:inline-block;background:#e50914;color:#fff;padding:13px 20px;text-decoration:none;border-radius:5px">Имэйл баталгаажуулах</a><p style="color:#777;font-size:12px">Линк 24 цаг хүчинтэй.</p></div>`,
    });
    return { delivered: true, previewPath: null };
  }
  const previewDir = path.resolve(process.cwd(), "storage", "mail-preview");
  await mkdir(previewDir, { recursive: true });
  const previewPath = path.join(previewDir, "latest-verification.txt");
  await writeFile(
    previewPath,
    `To: ${email}\nVerification URL: ${url}\n`,
    "utf8",
  );
  return { delivered: false, previewPath };
}
