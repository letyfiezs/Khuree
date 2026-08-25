import { createSupabaseServerClient } from "@/lib/supabase";
export async function POST(request: Request) {
  const body = await request.json() as { email?: string; password?: string; returnTo?: string };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: body.email ?? "", password: body.password ?? "" });
  if (error || !data.user) return Response.json({ error: "Имэйл эсвэл нууц үг буруу байна." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  const safeReturn = body.returnTo?.startsWith("/") && !body.returnTo.startsWith("//") ? body.returnTo : profile?.role === "admin" ? "/admin" : "/movies";
  return Response.json({ ok: true, returnTo: safeReturn, user: { name: data.user.user_metadata?.name, role: profile?.role ?? "user" } });
}
