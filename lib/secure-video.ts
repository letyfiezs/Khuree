import "server-only";
import { createHmac } from "node:crypto";

function config() {
  const baseUrl = process.env.VIDEO_EDGE_URL?.replace(/\/$/, "");
  const secret = process.env.VIDEO_EDGE_SECRET;
  if (!baseUrl || !secret) throw new Error("Secure video delivery environment variables are missing.");
  return { baseUrl, secret };
}

export function secureHlsPlaybackUrl(userId: string, assetId: string, ttlSeconds = 8 * 60 * 60) {
  if (!/^[0-9a-f-]{36}$/i.test(assetId)) throw new Error("Invalid secure video asset.");
  const { baseUrl, secret } = config();
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const signature = createHmac("sha256", secret)
    .update(`${userId}:${assetId}:${expires}`)
    .digest("base64url");
  const query = new URLSearchParams({ u: userId, e: String(expires), s: signature });
  return `${baseUrl}/stream/${assetId}/index.m3u8?${query}`;
}

export async function secureHlsReady(assetId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(assetId)) return false;
  const { baseUrl, secret } = config();
  try {
    const response = await fetch(`${baseUrl}/internal/hls/${assetId}/index.m3u8`, {
      method: "HEAD",
      headers: { "x-khuree-internal-secret": secret },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
