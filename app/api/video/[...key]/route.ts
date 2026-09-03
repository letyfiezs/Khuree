import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getCurrentUser } from "@/lib/auth/local-auth";
import { r2 } from "@/lib/r2";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { cookies } from "next/headers";
import { verifyVideoAccessToken } from "@/lib/video-access";

export const runtime = "nodejs";

const parseKey = async (params: Promise<{ key: string[] }>) => {
  const key = (await params).key.join("/");
  return /^movies\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp4|ts)$/i.test(key) ? key : undefined;
};

const contentType = (key: string) => key.toLowerCase().endsWith(".ts") ? "video/mp2t" : "video/mp4";

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
  const { data } = await createSupabaseAdminClient()
    .from("movies")
    .select("kind,age_rating,genres:movie_genres(genres(name))")
    .eq("video_key", key)
    .maybeSingle();
  if (!data) return { error: new Response("Not found", { status: 404 }) };
  const genreRows = data.genres as unknown as { genres: { name: string } | null }[] | null;
  const vertical = genreRows?.some((row) => row.genres?.name === "Босоо драма") ?? false;
  const section = data.age_rating === "18+" ? "adult" : vertical ? "vertical" : data.kind === "series" ? "series" : "movie";
  if (user.role !== "admin" && (!user.canWatch || !user.watchPermissions[section])) return { error: new Response("Forbidden", { status: 403 }) };
  if (user.role !== "admin") {
    const deviceId = (await cookies()).get("khuree-device-id")?.value;
    if (!deviceId || !user.devices.some((device) => device.id === deviceId)) return { error: new Response("Device not registered", { status: 403 }) };
  }
  if (data.age_rating === "18+" && (!user.adultEnabled || !user.adultUnlocked)) return { error: new Response("Parental PIN required", { status: 403 }) };
  return {};
}

export async function HEAD(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = await parseKey(params);
  if (!key) return new Response(null, { status: 404 });
  const access = await authorize(request, key);
  if (access.error) return access.error;
  try {
    const { client, bucket } = r2();
    const object = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return new Response(null, { headers: { "Content-Type": contentType(key), "Content-Length": String(object.ContentLength ?? 0), "Accept-Ranges": "bytes", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'" } });
  } catch {
    return new Response(null, { status: 404 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = await parseKey(params);
  if (!key) return new Response("Not found", { status: 404 });
  const access = await authorize(request, key);
  if (access.error) return access.error;
  try {
    const { client, bucket } = r2();
    const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: request.headers.get("range") ?? undefined }));
    if (!object.Body) return new Response("Not found", { status: 404 });
    const headers = new Headers({
      "Content-Type": contentType(key),
      "Accept-Ranges": object.AcceptRanges ?? "bytes",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    });
    if (object.ContentLength !== undefined) headers.set("Content-Length", String(object.ContentLength));
    if (object.ContentRange) headers.set("Content-Range", object.ContentRange);
    return new Response(object.Body.transformToWebStream(), { status: object.ContentRange ? 206 : 200, headers });
  } catch {
    return new Response("Video load failed", { status: 502 });
  }
}
