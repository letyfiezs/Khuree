import { createSupabaseServerClient } from "@/lib/supabase";
export async function POST(request: Request) {
  const body = await request.json() as { name?: string; email?: string; password?: string };
  if (!body.name?.trim() || !body.email?.includes("@") || !body.password || body.password.length < 8) return Response.json({ error: "Нэр, зөв имэйл болон 8-аас дээш тэмдэгттэй нууц үг оруулна уу." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({ email: body.email, password: body.password, options: { data: { name: body.name.trim() }, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin}/login?verified=1` } });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true, delivered: true });
}
