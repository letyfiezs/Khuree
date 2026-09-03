import { apiAdmin } from "@/lib/admin";
import { listAdminUsers } from "@/lib/admin-users";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function GET() {
  if (!(await apiAdmin())) return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 403 });
  const db = createSupabaseAdminClient();
  const [{ data: messages, error }, users] = await Promise.all([
    db.from("user_messages").select("id,user_id,sender_role,body,created_at,read_at").order("created_at", { ascending: false }).limit(500),
    listAdminUsers(),
  ]);
  if (error) return Response.json({ error: "Chat мэдээллийг авч чадсангүй." }, { status: 500 });
  const userById = new Map(users.map((user) => [user.id, user]));
  const threads = new Map<string, { id: string; name: string; contact: string; latest: string; latestAt: string; unread: number }>();
  for (const message of messages ?? []) {
    if (threads.has(message.user_id)) { if (message.sender_role === "user" && !message.read_at) threads.get(message.user_id)!.unread += 1; continue; }
    const user = userById.get(message.user_id);
    if (!user) continue;
    threads.set(message.user_id, { id: user.id, name: user.name, contact: user.phone || user.email, latest: message.body, latestAt: message.created_at, unread: message.sender_role === "user" && !message.read_at ? 1 : 0 });
  }
  return Response.json({ threads: [...threads.values()] });
}
