import { createSupabaseServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json() as { email?: unknown; token?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(token)) return Response.json({ error: "Имэйл эсвэл 6 оронтой код буруу байна." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "recovery" });
  if (error || !data.user) return Response.json({ error: "Код буруу эсвэл хугацаа нь дууссан байна." }, { status: 401 });
  return Response.json({ ok: true });
}
