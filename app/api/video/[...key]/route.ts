import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { posix } from "node:path";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/local-auth";
import { hasContentAccess } from "@/lib/content-access";
import type { ContentItem } from "@/lib/content";
import { getR2ObjectText, r2, signedR2PlaybackUrl } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { createVideoAccessPath, verifyVideoAccessToken } from "@/lib/video-access";

export const runtime = "nodejs";

const originalKey = /^movies\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp4|ts)$/i;
const hlsPlaylistKey = /^movies\/[0-9a-f-]{36}\/hls\/(?:master\.m3u8|(?:1080|720|360)\/index\.m3u8)$/i;

const parseKey = async (params: Promise<{ key: string[] }>) => {
  const key = (await params).key.join("/");
  return originalKey.test(key) || hlsPlaylistKey.test(key) ? key : undefined;
};

const masterKeyFor = (key: string) => {
  const match = key.match(/^(movies\/[0-9a-f-]{36}\/hls\/)/i);
  return match ? `${match[1]}master.m3u8` : undefined;
};

const contentType = (key: string) => key.toLowerCase().endsWith(".m3u8")
  ? "application/vnd.apple.mpegurl"
  : key.toLowerCase().endsWith(".ts") ? "video/mp2t" : "video/mp4";

async function authorize(request: Request, key: string) {
  const user = await getCurrentUser();
  if (!user?.emailVerified) return { error: new Response("Unauthorized", { status: 401 }) };
  const url = new URL(request.url);
  const expires = Number(url.searchParams.get("expires"));
  const token = url.searchParams.get("token") ?? "";
  if (!verifyVideoAccessToken(user.id, key, expires, token)) return { error: new Response("Expired video access", { status: 403 }) };
  const fetchSite = request.headers.get("sec-fetch-site");
  const referer = request.headers.get("referer");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") return { error: new Response("Cross-site playback blocked", { status: 403 }) };
  if (referer) {
    try { if (new URL(referer).origin !== url.origin) return { error: new Response("Invalid playback origin", { status: 403 }) }; }
    catch { return { error: new Response("Invalid playback origin", { status: 403 }) }; }
  }
  const masterKey = masterKeyFor(key);
  let query = createSupabaseAdminClient().from("movies").select("id,kind,series_id,is_free,rental_price,age_rating,genres:movie_genres(genres(name))");
  query = masterKey ? query.eq("hls_key", masterKey) : query.eq("video_key", key);
  const { data } = await query.maybeSingle();
  if (!data) return { error: new Response("Not found", { status: 404 }) };
  const genreRows = data.genres as unknown as { genres: { name: string } | null }[] | null;
  const genre = genreRows?.map((row) => row.genres?.name).filter((name): name is string => Boolean(name)) ?? [];
  const accessItem = { id: data.id, kind: data.kind, seriesId: data.series_id ?? undefined, isFree: Boolean(data.is_free), rentalPrice: data.rental_price ?? undefined, age: data.age_rating, genre } as ContentItem;
  if (!(await hasContentAccess(user, accessItem))) return { error: new Response("Rental required", { status: 403 }) };
  if (user.role !== "admin") {
    const deviceId = (await cookies()).get("khuree-device-id")?.value;
    if (!deviceId || !user.devices.some((device) => device.id === deviceId)) return { error: new Response("Device not registered", { status: 403 }) };
  }
  if (data.age_rating === "18+" && (!user.adultEnabled || !user.adultUnlocked)) return { error: new Response("Parental PIN required", { status: 403 }) };
  return { userId: user.id, expires };
}

function resolvePlaylistUri(playlistKey: string, uri: string) {
  if (!uri || /^[a-z]+:/i.test(uri) || uri.startsWith("//") || uri.includes("..")) return undefined;
  const resolved = posix.normalize(posix.join(posix.dirname(playlistKey), uri));
  return resolved.startsWith("movies/") ? resolved : undefined;
}

async function rewritePlaylist(source: string, key: string, userId: string, expires: number) {
  const ttl = Math.max(60, Math.min(6 * 60 * 60, expires - Math.floor(Date.now() / 1000)));
  const lines = source.replace(/\r/g, "").split("\n");
  return (await Promise.all(lines.map(async (line) => {
    const uri = line.trim();
    if (!uri || uri.startsWith("#")) return line;
    const resolved = resolvePlaylistUri(key, uri);
    if (!resolved || (!resolved.endsWith(".m3u8") && !resolved.endsWith(".ts"))) throw new Error("Invalid HLS playlist path");
    return resolved.endsWith(".m3u8")
      ? createVideoAccessPath(userId, resolved, ttl)
      : signedR2PlaybackUrl(resolved, ttl);
  }))).join("\n");
}

export async function HEAD(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = await parseKey(params);
  if (!key) return new Response(null, { status: 404 });
  const access = await authorize(request, key);
  if (access.error) return access.error;
  try {
    const { client, bucket } = r2();
    const object = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return new Response(null, { headers: { "Content-Type": contentType(key), "Content-Length": String(object.ContentLength ?? 0), "Accept-Ranges": "bytes", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosn", "Content-Security-Policy": "default-src 'none'" } });
  } catch { return new Response(null, { status: 404 }); }
}

export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = await parseKey(params);
  if (!key) return new Response("Not found", { status: 404 });
  const access = await authorize(request, key);
  if (access.error || !access.userId || !access.expires) return access.error ?? new Response("Unauthorized", { status: 401 });
  try {
    if (key.endsWith(".m3u8")) {
      const playlist = await rewritePlaylist(await getR2ObjectText(key), key, access.userId, access.expires);
      return new Response(playlist, { headers: { "Content-Type": contentType(key), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosn", "Content-Security-Policy": "default-src 'none'" } });
    }
    const { client, bucket } = r2();
    const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: request.headers.get("range") ?? undefined }));
    if (!object.Body) return new Response("Not found", { status: 404 });
    const headers = new Headers({ "Content-Type": contentType(key), "Accept-Ranges": object.AcceptRanges ?? "bytes", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosn", "Content-Security-Policy": "default-src 'none'" });
    if (object.ContentLength !== undefined) headers.set("Content-Length", String(object.ContentLength));
    if (object.ContentRange) headers.set("Content-Range", object.ContentRange);
    return new Response(object.Body.transformToWebStream(), { status: object.ContentRange ? 206 : 200, headers });
  } catch (error) {
    console.error("Video delivery failed", { key, error: error instanceof Error ? error.message : "unknown" });
    return new Response("Video load failed", { status: 502 });
  }
}
