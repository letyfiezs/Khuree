import { createSupabaseServerClient } from "@/lib/supabase";

const emailPattern = /^\S+@\S+\.\S+$/;

export async function POST(request: Request) {
  const body = await request.json() as { email?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!emailPattern.test(email)) return Response.json({ error: "Зөв имэйл хаяг оруулна уу." }, { status: 400 });
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin}/login`,
    });
    if (error) console.error("Password recovery request failed:", error.message);
  } catch (error) {
    console.error("Password recovery request failed:", error instanceof Error ? error.message : "unknown error");
  }
  return Response.json({ ok: true, message: "Хэрэв энэ и-мэйл бүртгэлтэй бол баталгаажуулах код илгээгдэнэ." });
}
