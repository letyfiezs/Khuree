import { apiAdmin } from "@/lib/admin";
import { sendAdminMessageEmail } from "@/lib/auth/mailer";
import { createSupabaseAdminClient } from "@/lib/supabase";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const selectFields = "id,sender_role,body,created_at";

async function targetUser(id: string) {
  const db = createSupabaseAdminClient();
  const { data, error } = await db.auth.admin.getUserById(id);
  return { db, user: data.user, error };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await apiAdmin())) return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 403 });
  const { id } = await params;
  if (!uuid.test(id)) return Response.json({ error: "Хэрэглэгчийн ID буруу." }, { status: 400 });
  const { db, user } = await targetUser(id);
  if (!user) return Response.json({ error: "Хэрэглэгч олдсонгүй." }, { status: 404 });
  const { data, error } = await db.from("user_messages").select(selectFields).eq("user_id", id).order("created_at", { ascending: true }).limit(200);
  if (error) return Response.json({ error: "Зурвасуудыг авч чадсангүй." }, { status: 500 });
  await db.from("user_messages").update({ read_at: new Date().toISOString() }).eq("user_id", id).eq("sender_role", "user").is("read_at", null);
  return Response.json({ messages: data ?? [] });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await apiAdmin())) return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 403 });
  const { id } = await params;
  if (!uuid.test(id)) return Response.json({ error: "Хэрэглэгчийн ID буруу." }, { status: 400 });
  const body = await request.json() as { message?: unknown };
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 2000) return Response.json({ error: "Зурвас 1–2000 тэмдэгттэй байна." }, { status: 400 });
  const { db, user } = await targetUser(id);
  if (!user) return Response.json({ error: "Хэрэглэгч олдсонгүй." }, { status: 404 });
  const { data, error } = await db.from("user_messages").insert({ user_id: id, sender_role: "admin", body: message }).select(selectFields).single();
  if (error || !data) return Response.json({ error: "Зурвас илгээж чадсангүй." }, { status: 500 });
  const email = user.email?.endsWith("@khuree.local") ? "" : user.email;
  if (email) await sendAdminMessageEmail(email, user.user_metadata?.name || email.split("@")[0], message).catch((cause) => console.error("Message email failed:", cause instanceof Error ? cause.message : "unknown error"));
  return Response.json({ message: data }, { status: 201 });
}
