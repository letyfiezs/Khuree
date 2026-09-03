import { getCurrentUser } from "@/lib/auth/local-auth";
import { listActiveViewing, type ActiveViewing } from "@/lib/live-presence";
import { createSupabaseAdminClient } from "@/lib/supabase";

const STALE_SESSION_MS = 24 * 60 * 60 * 1_000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PresenceBody = { movieId?: string; sessionId?: string };
function noStoreJson(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: { "Cache-Control": "no-store", ...init?.headers },
  });
}

async function readBody(request: Request) {
  try {
    return await request.json() as PresenceBody;
  } catch {
    return {} as PresenceBody;
  }
}

function validPresence(body: PresenceBody) {
  return Boolean(body.movieId && body.sessionId && uuid.test(body.movieId) && uuid.test(body.sessionId));
}

export async function GET() {
  let active;
  try {
    active = await listActiveViewing();
  } catch (error) {
    const databaseError = error as { code?: string; message?: string };
    return noStoreJson({ items: [], error: databaseError.message ?? "Live үзэлтийг уншиж чадсангүй.", setupRequired: databaseError.code === "42P01" }, { status: databaseError.code === "42P01" ? 503 : 500 });
  }

  const grouped = new Map<string, { content: ActiveViewing["content"]; viewers: Set<string> }>();
  for (const row of active) {
    const current = grouped.get(row.content.id) ?? { content: row.content, viewers: new Set<string>() };
    current.viewers.add(row.viewerId);
    grouped.set(row.content.id, current);
  }

  const items = [...grouped.values()]
    .sort((a, b) => b.viewers.size - a.viewers.size || a.content.title.localeCompare(b.content.title, "mn"))
    .slice(0, 5)
    .map(({ content, viewers }) => ({
      ...content,
      viewerCount: viewers.size,
    }));

  return noStoreJson({ items });
}

export async function POST(request: Request) {
  const body = await readBody(request);
  if (!validPresence(body)) return noStoreJson({ error: "Кино эсвэл session ID буруу байна." }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return noStoreJson({ error: "Нэвтэрч орно уу." }, { status: 401 });

  const db = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { error } = await db.from("live_movie_presence").upsert({
    viewer_id: user.id,
    session_id: body.sessionId,
    movie_id: body.movieId,
    last_seen_at: now,
  }, { onConflict: "viewer_id,session_id" });

  if (error) return noStoreJson({ error: error.message, setupRequired: error.code === "42P01" }, { status: error.code === "42P01" ? 503 : 500 });

  void db.from("live_movie_presence")
    .delete()
    .eq("viewer_id", user.id)
    .lt("last_seen_at", new Date(Date.now() - STALE_SESSION_MS).toISOString());

  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const body = await readBody(request);
  if (!validPresence(body)) return new Response(null, { status: 204 });

  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 204 });

  const { error } = await createSupabaseAdminClient()
    .from("live_movie_presence")
    .delete()
    .eq("viewer_id", user.id)
    .eq("session_id", body.sessionId)
    .eq("movie_id", body.movieId);

  return error
    ? noStoreJson({ error: error.message }, { status: 500 })
    : new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
