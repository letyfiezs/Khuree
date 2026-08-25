import "server-only";
import { AbortMultipartUploadCommand, CompleteMultipartUploadCommand, CreateMultipartUploadCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client, UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const R2_HARD_LIMIT_BYTES = 990 * 1000 ** 3;
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
  const result = await client.send(new CreateMultipartUploadCommand({ Bucket: bucket, Key: key, ContentType: contentType }));
  if (!result.UploadId) throw new Error("R2 did not return an upload ID.");
  return result.UploadId;
}
export async function signPart(key: string, uploadId: string, partNumber: number) {
  const { client, bucket } = r2();
  return getSignedUrl(client, new UploadPartCommand({ Bucket: bucket, Key: key, UploadId: uploadId, PartNumber: partNumber }), { expiresIn: 900 });
}
export async function finishMultipart(key: string, uploadId: string, parts: { ETag: string; PartNumber: number }[]) {
  const { client, bucket } = r2();
  await client.send(new CompleteMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId, MultipartUpload: { Parts: parts } }));
}
export async function abortMultipart(key: string, uploadId: string) {
  const { client, bucket } = r2();
  await client.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId }));
}
export async function deleteR2Object(key: string) {
  const { client, bucket } = r2();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
export async function putR2Object(key: string, body: Buffer, contentType: string) {
  await ensureR2StorageCapacity(body.byteLength, key);
  const { client, bucket } = r2();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }));
}
export async function getR2ObjectText(key: string) { const { client, bucket } = r2(); const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key })); return result.Body?.transformToString("utf-8") ?? ""; }
export async function objectExists(key: string) {
  const { client, bucket } = r2();
  try { await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key })); return true; } catch { return false; }
}
export function publicR2Url(key: string) {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  return base ? `${base}/${key.split("/").map(encodeURIComponent).join("/")}` : undefined;
}
export async function getR2StorageUsage() {
  const { client, bucket } = r2();
  let continuationToken: string | undefined;
  let bytes = 0, objects = 0;
  const breakdown = {
    video: { bytes: 0, objects: 0 }, subtitle: { bytes: 0, objects: 0 },
    thumbnail: { bytes: 0, objects: 0 }, hero: { bytes: 0, objects: 0 },
    other: { bytes: 0, objects: 0 },
  };
  do {
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

export async function ensureR2StorageCapacity(additionalBytes: number, replacingKey?: string) {
  const usage = await getR2StorageUsage();
  let replacedBytes = 0;
  if (replacingKey) {
    const { client, bucket } = r2();
    try {
      const existing = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: replacingKey }));
      replacedBytes = existing.ContentLength ?? 0;
    } catch { /* New object. */ }
  }
  const projectedBytes = Math.max(0, usage.bytes - replacedBytes) + additionalBytes;
  if (projectedBytes > R2_HARD_LIMIT_BYTES) throw new R2StorageLimitError();
  return { currentBytes: usage.bytes, projectedBytes, remainingBytes: R2_HARD_LIMIT_BYTES - projectedBytes };
}

export async function enforceR2HardLimit(newObjectKey: string) {
  const usage = await getR2StorageUsage();
  if (usage.bytes <= R2_HARD_LIMIT_BYTES) return usage;
  await deleteR2Object(newObjectKey).catch(() => undefined);
  throw new R2StorageLimitError();
}
