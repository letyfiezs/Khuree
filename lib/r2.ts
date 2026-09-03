import "server-only";
import { AbortMultipartUploadCommand, CompleteMultipartUploadCommand, CreateMultipartUploadCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client, UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const R2_HARD_LIMIT_BYTES = 990 * 1000 ** 3;
const USAGE_CACHE_MS = 15 * 60 * 1000;
const TEXT_CACHE_MS = 5 * 60 * 1000;
type R2Usage = Awaited<ReturnType<typeof scanR2StorageUsage>>;
let usageCache: { value: R2Usage; expiresAt: number } | undefined;
const textCache = new Map<string, { value: string; expiresAt: number }>();
function logR2(operation: string, key = "") {
  if (process.env.NODE_ENV !== "production") console.info(`[R2] ${operation}${key ? ` ${key}` : ""}`);
}
export class R2StorageLimitError extends Error {
  constructor() { super("R2 хадгалах сан 990 GB хатуу хязгаарт хүрсэн. Зай чөлөөлсний дараа дахин upload хийнэ үү."); }
}

function config() {
  const accountId = process.env.R2_ACCOUNT_ID, accessKeyId = process.env.R2_ACCESS_KEY_ID, secretAccessKey = process.env.R2_SECRET_ACCESS_KEY, bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) throw new Error("Cloudflare R2 environment variables are missing.");
  return { accountId, accessKeyId, secretAccessKey, bucket };
}
let cached: S3Client | undefined;
export function r2() {
  const cfg = config();
  cached ??= new S3Client({ region: "auto", endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey } });
  return { client: cached, bucket: cfg.bucket };
}
export async function beginMultipart(key: string, contentType: string) {
  const { client, bucket } = r2();
  logR2("CREATE_MULTIPART", key);
  const result = await client.send(new CreateMultipartUploadCommand({ Bucket: bucket, Key: key, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }));
  if (!result.UploadId) throw new Error("R2 did not return an upload ID.");
  return result.UploadId;
}
export async function signPart(key: string, uploadId: string, partNumber: number) {
  const { client, bucket } = r2();
  return getSignedUrl(client, new UploadPartCommand({ Bucket: bucket, Key: key, UploadId: uploadId, PartNumber: partNumber }), { expiresIn: 900 });
}
export async function finishMultipart(key: string, uploadId: string, parts: { ETag: string; PartNumber: number }[]) {
  const { client, bucket } = r2();
  logR2("COMPLETE_MULTIPART", key);
  await client.send(new CompleteMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId, MultipartUpload: { Parts: parts } }));
}
export async function abortMultipart(key: string, uploadId: string) {
  const { client, bucket } = r2();
  logR2("ABORT_MULTIPART", key);
  await client.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId }));
}
export async function deleteR2Object(key: string) {
  const { client, bucket } = r2();
  logR2("DELETE", key);
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  usageCache = undefined;
  textCache.delete(key);
}
export async function signedR2DownloadUrl(key: string, downloadName?: string) {
  const { client, bucket } = r2();
  const disposition = downloadName ? `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}` : undefined;
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentDisposition: disposition }), { expiresIn: 900 });
}
export async function signedR2PlaybackUrl(key: string, ttlSeconds = 4 * 60 * 60) {
  const { client, bucket } = r2();
  const type = key.toLowerCase().endsWith(".ts") ? "video/mp2t" : "video/mp4";
  return getSignedUrl(client, new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentType: type,
    ResponseContentDisposition: "inline",
    ResponseCacheControl: "private, max-age=3600",
  }), { expiresIn: ttlSeconds });
}
export async function putR2Object(key: string, body: Buffer, contentType: string) {
  await ensureR2StorageCapacity(body.byteLength);
  const { client, bucket } = r2();
  logR2("PUT", key);
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }));
  textCache.set(key, { value: body.toString("utf8"), expiresAt: Date.now() + TEXT_CACHE_MS });
  // Keep the cached value conservative. It may temporarily overcount replacements,
  // but never permits an upload beyond the configured hard limit.
  if (usageCache) {
    const normalized = key.toLowerCase();
    const category = normalized.startsWith("subtitles/") || /\.(?:vtt|srt)$/.test(normalized) ? "subtitle"
      : normalized.startsWith("posters/") || normalized.startsWith("series-posters/") ? "thumbnail"
      : normalized.startsWith("backdrops/") ? "hero" : "other";
    usageCache.value.bytes += body.byteLength;
    usageCache.value.objects += 1;
    usageCache.value.breakdown[category].bytes += body.byteLength;
    usageCache.value.breakdown[category].objects += 1;
  }
}
export async function getR2ObjectText(key: string) {
  const cachedText = textCache.get(key);
  if (cachedText && cachedText.expiresAt > Date.now()) return cachedText.value;
  const { client, bucket } = r2();
  logR2("GET", key);
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const value = await result.Body?.transformToString("utf-8") ?? "";
  textCache.set(key, { value, expiresAt: Date.now() + TEXT_CACHE_MS });
  return value;
}
export function publicR2Url(key: string) {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  return base ? `${base}/${key.split("/").map(encodeURIComponent).join("/")}` : undefined;
}
async function scanR2StorageUsage() {
  const { client, bucket } = r2();
  let continuationToken: string | undefined;
  let bytes = 0, objects = 0;
  const breakdown = {
    video: { bytes: 0, objects: 0 }, subtitle: { bytes: 0, objects: 0 },
    thumbnail: { bytes: 0, objects: 0 }, hero: { bytes: 0, objects: 0 },
    other: { bytes: 0, objects: 0 },
  };
  do {
    logR2("LIST", continuationToken ? "(next page)" : "movies/");
    const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken }));
    for (const object of page.Contents ?? []) {
      const size = object.Size ?? 0;
      const key = (object.Key ?? "").toLowerCase();
      const category = key.startsWith("movies/") ? "video"
        : key.startsWith("subtitles/") || /\.(?:vtt|srt)$/.test(key) ? "subtitle"
        : key.startsWith("posters/") || key.startsWith("series-posters/") ? "thumbnail"
        : key.startsWith("backdrops/") ? "hero" : "other";
      bytes += size; objects += 1;
      breakdown[category].bytes += size; breakdown[category].objects += 1;
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return { bytes, objects, breakdown };
}

export async function getR2StorageUsage(options: { force?: boolean } = {}) {
  if (!options.force && usageCache && usageCache.expiresAt > Date.now()) return usageCache.value;
  const value = await scanR2StorageUsage();
  usageCache = { value, expiresAt: Date.now() + USAGE_CACHE_MS };
  return value;
}

export async function ensureR2StorageCapacity(additionalBytes: number) {
  const usage = await getR2StorageUsage();
  // Avoid a Class B HEAD for replacements. Conservatively counting the whole new
  // object is safe and the next periodic scan corrects the temporary overcount.
  const projectedBytes = usage.bytes + additionalBytes;
  if (projectedBytes > R2_HARD_LIMIT_BYTES) throw new R2StorageLimitError();
  return { currentBytes: usage.bytes, projectedBytes, remainingBytes: R2_HARD_LIMIT_BYTES - projectedBytes };
}

export function recordCompletedR2Upload(bytes: number) {
  if (!usageCache || !Number.isFinite(bytes) || bytes <= 0) return;
  usageCache.value.bytes += bytes;
  usageCache.value.objects += 1;
  usageCache.value.breakdown.video.bytes += bytes;
  usageCache.value.breakdown.video.objects += 1;
}
