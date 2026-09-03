import { getCurrentUser } from "@/lib/auth/local-auth";
import { createSupabaseAdminClient } from "@/lib/supabase";

const selectFields = "id,sender_role,body,created_at";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  const db = createSupabaseAdminClient();
  const { data, error } = await db.from("user_messages").select(selectFields).eq("user_id", user.id).order("created_at", { ascending: true }).limit(100);
  if (error) return Response.json({ error: "Зурвасуудыг авч чадсангүй." }, { status: 500 });
  await db.from("user_messages").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).eq("sender_role", "admin").is("read_at", null);
  return Response.json({ messages: data ?? [] });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  const body = await request.json() as { message?: unknown };
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 2000) return Response.json({ error: "Зурвас 1–2000 тэмдэгттэй байна." }, { status: 400 });
  const db = createSupabaseAdminClient();
  const { data, error } = await db.from("user_messages").insert({ user_id: user.id, sender_role: "user", body: message }).select(selectFields).single();
  if (error || !data) return Response.json({ error: "Зурвас илгээж чадсангүй." }, { status: 500 });
  return Response.json({ message: data }, { status: 201 });
}
