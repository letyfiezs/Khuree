import { open, stat } from "node:fs/promises";
import path from "node:path";
import { videosRoot } from "@/lib/storage/local";
import { getCurrentUser } from "@/lib/auth/local-auth";
import { movieStorage } from "@/lib/storage";
export const runtime = "nodejs";
const MAX_RANGE_BYTES = 4 * 1024 * 1024;
export async function HEAD(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const user = await getCurrentUser();
  if (!user?.emailVerified) return new Response(null, { status: 401 });
  if (!user.canWatch && user.role !== "admin") return new Response(null, { status: 403 });
  const key = (await params).key;
  if (!/^[a-f0-9-]{20,50}\.(mp4|mov|mkv|m3u8|ts)$/i.test(key))
    return new Response(null, { status: 404 });
  const movie = movieStorage.listMovies().find((item) => item.videoKey === key);
  if (movie?.ageRating === "18+" && (!user.adultEnabled || !user.adultUnlocked))
    return new Response(null, { status: 403 });
  try {
    const info = await stat(path.join(videosRoot, key));
    const contentType = key.endsWith(".ts")
      ? "video/mp2t"
      : key.endsWith(".m3u8")
      ? "application/vnd.apple.mpegurl"
      : key.endsWith(".mov")
        ? "video/quicktime"
        : key.endsWith(".mkv")
          ? "video/x-matroska"
          : "video/mp4";
    return new Response(null, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const user = await getCurrentUser();
  if (!user?.emailVerified)
    return new Response("Unauthorized", { status: 401 });
  if (!user.canWatch && user.role !== "admin")
    return new Response("Viewing permission disabled", { status: 403 });
  const key = (await params).key;
  if (!/^[a-f0-9-]{20,50}\.(mp4|mov|mkv|m3u8|ts)$/i.test(key))
    return new Response("Not found", { status: 404 });
  const movie = movieStorage.listMovies().find((item) => item.videoKey === key);
  if (movie?.ageRating === "18+" && (!user.adultEnabled || !user.adultUnlocked))
    return new Response("Parental PIN required", { status: 403 });
  const file = path.join(videosRoot, key);
  let info;
  try {
    info = await stat(file);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const contentType = key.endsWith(".ts")
    ? "video/mp2t"
    : key.endsWith(".m3u8")
    ? "application/vnd.apple.mpegurl"
    : key.endsWith(".mov")
      ? "video/quicktime"
      : key.endsWith(".mkv")
        ? "video/x-matroska"
        : "video/mp4";
  const range = request.headers.get("range");
  if (!range) {
    const handle = await open(file, "r");
    try {
      const bytes = await handle.readFile();
      return new Response(bytes, {
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(info.size),
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, no-store",
        },
      });
    } finally {
      await handle.close();
    }
  }
  const match = /bytes=(\d*)-(\d*)/.exec(range);
  if (!match || (!match[1] && !match[2]))
    return new Response("Bad range", { status: 416 });
  const suffixLength = !match[1] ? Number(match[2]) : 0;
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, info.size - suffixLength);
  if (start >= info.size)
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${info.size}` },
    });
  const requestedEnd =
    match[1] && match[2]
      ? Number(match[2])
      : match[1]
        ? start + MAX_RANGE_BYTES - 1
        : info.size - 1;
  const end = Math.min(
    requestedEnd,
    info.size - 1,
    start + MAX_RANGE_BYTES - 1,
  );
  if (end < start) return new Response("Bad range", { status: 416 });
  const length = end - start + 1;
  const bytes = Buffer.allocUnsafe(length);
  const handle = await open(file, "r");
  try {
    const { bytesRead } = await handle.read(bytes, 0, length, start);
    const body = bytes.subarray(0, bytesRead);
    return new Response(body, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytesRead),
        "Content-Range": `bytes ${start}-${start + bytesRead - 1}/${info.size}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
      },
    });
  } finally {
    await handle.close();
  }
}
