import { apiAdmin } from "@/lib/admin";
import { listActiveViewing } from "@/lib/live-presence";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function GET() {
  if (!(await apiAdmin()))
    return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 403 });

  const client = createSupabaseAdminClient();
  const activeViewingPromise = listActiveViewing();
  const users: { id: string; lastSeenAt?: string; watching?: { id: string; title: string; kind: "movie" | "series" } }[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    users.push(...data.users.map((user) => ({
      id: user.id,
      lastSeenAt: typeof user.user_metadata?.presence_last_seen_at === "string"
        ? user.user_metadata.presence_last_seen_at
        : undefined,
    })));
    if (data.users.length < 1000) break;
  }
  const activeViewing = await activeViewingPromise;
  const latestByViewer = new Map<string, (typeof activeViewing)[number]>();
  for (const viewing of activeViewing) {
    const current = latestByViewer.get(viewing.viewerId);
    if (!current || viewing.lastSeenAt > current.lastSeenAt) latestByViewer.set(viewing.viewerId, viewing);
  }
  for (const user of users) {
    const viewing = latestByViewer.get(user.id);
    if (!viewing) continue;
    if (!user.lastSeenAt || viewing.lastSeenAt > user.lastSeenAt) user.lastSeenAt = viewing.lastSeenAt;
    user.watching = { id: viewing.content.id, title: viewing.content.title, kind: viewing.content.kind };
  }
  return Response.json({ users, checkedAt: new Date().toISOString() }, {
    headers: { "cache-control": "no-store" },
  });
}
