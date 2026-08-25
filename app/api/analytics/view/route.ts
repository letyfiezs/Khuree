import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/local-auth";
import { createSupabaseAdminClient } from "@/lib/supabase";

const viewerCookie = "khuree-viewer-id";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request: Request) {
  const body = await request.json() as { movieId?: string };
  if (!body.movieId || !uuid.test(body.movieId)) return Response.json({ error: "Киноны ID буруу." }, { status: 400 });
  const user = await getCurrentUser();
  const store = await cookies();
  let viewerId = user?.id ?? store.get(viewerCookie)?.value;
  if (!viewerId || !uuid.test(viewerId)) {
    viewerId = crypto.randomUUID();
    store.set(viewerCookie, viewerId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  const db = createSupabaseAdminClient();
  const { data: existing } = await db.from("analytics_events").select("id").eq("movie_id", body.movieId).eq("viewer_id", viewerId).eq("event_type", "play").limit(1).maybeSingle();
  if (existing) return Response.json({ ok: true, unique: false });
  const { error } = await db.from("analytics_events").insert({ movie_id: body.movieId, viewer_id: viewerId, event_type: "play" });
  return error ? Response.json({ error: error.message }, { status: 500 }) : Response.json({ ok: true });
}
