import { apiAdmin } from "@/lib/admin";
import { getR2StorageUsage } from "@/lib/r2";
import { R2_HARD_LIMIT_BYTES } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function GET() {
  if (!(await apiAdmin())) return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 401 });
  const db = createSupabaseAdminClient();
  const now = new Date();
  const today = new Date(now); today.setUTCHours(0, 0, 0, 0);
  const week = new Date(today); week.setUTCDate(week.getUTCDate() - 6);
  const [storage, movies, users, allEvents] = await Promise.all([
    getR2StorageUsage(),
    db.from("movies").select("id", { count: "exact", head: true }),
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("analytics_events").select("movie_id,viewer_id,created_at,movies(title)").eq("event_type", "play").order("created_at").limit(50000),
  ]);
  const events = (allEvents.data ?? []) as unknown as { movie_id: string; viewer_id: string; created_at: string; movies: { title: string } | null }[];
  const uniqueEvents = [...new Map(events.map((event) => [`${event.movie_id}:${event.viewer_id}`, event])).values()];
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(week); date.setUTCDate(week.getUTCDate() + index); return { date: date.toISOString().slice(0, 10), views: 0 }; });
  const top = new Map<string, { title: string; views: number }>();
  for (const event of uniqueEvents) {
    const day = days.find((item) => item.date === event.created_at.slice(0, 10)); if (day) day.views += 1;
    const current = top.get(event.movie_id) ?? { title: event.movies?.title ?? "Кино", views: 0 }; current.views += 1; top.set(event.movie_id, current);
  }
  const storageLimitBytes = R2_HARD_LIMIT_BYTES;
  const freeTierBytes = 10 * 1000 ** 3;
  const estimatedStorageUsd = Math.max(0, storage.bytes - freeTierBytes) / 1000 ** 3 * 0.015;
  return Response.json({
    updatedAt: now.toISOString(), storage: {
      ...storage,
      limitBytes: storageLimitBytes,
      freeTierBytes,
      remainingBytes: Math.max(0, storageLimitBytes - storage.bytes),
      percent: Math.min(100, storage.bytes / storageLimitBytes * 100),
      estimatedStorageUsd,
    },
    movies: movies.count ?? 0, users: users.count ?? 0, totalViews: events.length, uniqueViews: uniqueEvents.length,
    todayViews: uniqueEvents.filter((event) => event.created_at >= today.toISOString()).length,
    uniqueViewers7d: new Set(uniqueEvents.filter((event) => event.created_at >= week.toISOString()).map((event) => event.viewer_id)).size,
    days, topMovies: [...top.values()].sort((a, b) => b.views - a.views).slice(0, 5),
  });
}
