import { spawn } from "node:child_process";
import { apiAdmin } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { secureHlsReady } from "@/lib/secure-video";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await apiAdmin())) return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Киноны ID буруу байна." }, { status: 400 });
  const db = createSupabaseAdminClient();
  const { data: movie, error } = await db.from("movies").select("id,video_key").eq("id", id).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!movie?.video_key) return Response.json({ error: "Киноны эх видео олдсонгүй." }, { status: 404 });
  if (await secureHlsReady(id)) return Response.json({ ok: true, status: "ready" });
  const child = spawn(process.execPath, ["scripts/protect-video.mjs", id], { cwd: process.cwd(), env: process.env, detached: true, stdio: "ignore" });
  child.unref();
  return Response.json({ ok: true, status: "queued" }, { status: 202 });
}
