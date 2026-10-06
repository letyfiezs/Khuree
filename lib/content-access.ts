import "server-only";
import { redirect } from "next/navigation";
import type { ContentItem } from "@/lib/content";
import type { LocalUser } from "@/lib/auth/local-auth";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { isVerticalDrama } from "@/lib/vertical-drama";

function packageAllows(user: LocalUser, item: ContentItem) {
  if (user.role === "admin") return true;
  if (item.age === "18+") return user.canWatch && user.watchPermissions.adult;
  if (isVerticalDrama(item)) return user.canWatch && user.watchPermissions.vertical;
  if (item.kind === "series") return user.canWatch && user.watchPermissions.series;
  return user.canWatch && user.watchPermissions.movie;
}

export async function hasContentAccess(user: LocalUser, item: ContentItem) {
  if (item.isFree || packageAllows(user, item)) return true;
  const db = createSupabaseAdminClient();
  if (item.kind === "series" && item.seriesId) {
    const { data: series } = await db.from("series").select("is_free").eq("id", item.seriesId).maybeSingle();
    if (series?.is_free) return true;
  }
  let query = db.from("content_rentals").select("id").eq("user_id", user.id).gt("expires_at", new Date().toISOString());
  query = item.kind === "series" && item.seriesId ? query.eq("series_id", item.seriesId) : query.eq("movie_id", item.id);
  const { data } = await query.limit(1);
  return Boolean(data?.length);
}

export async function requireContentAccess(user: LocalUser, item: ContentItem) {
  if (await hasContentAccess(user, item)) return;
  redirect(item.kind === "series" && item.seriesId ? `/series/${item.seriesId}?rent=1` : `/movie/${encodeURIComponent(item.slug)}?rent=1`);
}

export async function activateRental(userId: string, orderId: string, amount: number, target: { movieId?: string; seriesId?: string }, hours: number, paidAt?: string | null) {
  const startsAt = paidAt ?? new Date().toISOString();
  const expiresAt = new Date(new Date(startsAt).getTime() + hours * 60 * 60 * 1000).toISOString();
  const { error } = await createSupabaseAdminClient().from("content_rentals").upsert({
    user_id: userId, order_id: orderId, amount, starts_at: startsAt, expires_at: expiresAt,
    movie_id: target.movieId ?? null, series_id: target.seriesId ?? null,
  }, { onConflict: "order_id" });
  if (error) throw error;
  return expiresAt;
}
