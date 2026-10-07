import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("Video access secret тохируулаагүй байна.");
  return value;
}

function signature(userId: string, key: string, expires: number) {
  return createHmac("sha256", secret())
    .update(`${userId}:${key}:${expires}`)
    .digest("base64url");
}

export function createVideoAccessToken(userId: string, key: string, ttlSeconds = 6 * 60 * 60) {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  return { expires, token: signature(userId, key, expires) };
}

export function createVideoAccessPath(userId: string, key: string, ttlSeconds = 6 * 60 * 60) {
  const { expires, token } = createVideoAccessToken(userId, key, ttlSeconds);
  const pathname = key.split("/").map(encodeURIComponent).join("/");
  return `/api/video/${pathname}?expires=${expires}&token=${encodeURIComponent(token)}`;
}

export function verifyVideoAccessToken(userId: string, key: string, expires: number, token: string) {
  if (!Number.isSafeInteger(expires) || expires < Math.floor(Date.now() / 1000) || expires > Math.floor(Date.now() / 1000) + 7 * 60 * 60) return false;
  const expected = signature(userId, key, expires);
  const actualBytes = Buffer.from(token);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}
