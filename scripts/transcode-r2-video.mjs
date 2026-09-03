import { createReadStream, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { createClient } from "@supabase/supabase-js";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  GetObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const title = process.argv.slice(2).join(" ").trim();
if (!title) throw new Error("Киноны нэрийг argument-аар өгнө үү.");

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} тохиргоо дутуу байна.`);
}

const database = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const result = await database
  .from("movies")
  .select("id,title,video_key,bytes")
  .eq("title", title);
if (result.error) throw result.error;
if (result.data.length !== 1)
  throw new Error(`Яг нэг кино олдох ёстой. Олдсон: ${result.data.length}`);

const movie = result.data[0];
const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const client = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const bucket = process.env.R2_BUCKET_NAME;
const sourceUrl = await getSignedUrl(
  client,
  new GetObjectCommand({ Bucket: bucket, Key: movie.video_key }),
  { expiresIn: 60 * 60 },
);
const outputPath = path.join(os.tmpdir(), `khuree-${movie.id}-h264.mp4`);

console.log(`TRANSCODE_START ${movie.title}`);
await new Promise((resolve, reject) => {
  const process = spawn(ffmpegPath, [
    "-hide_banner",
    "-loglevel", "error",
    "-i", sourceUrl,
    "-map", "0:v:0",
    "-map", "0:a:0?",
    "-c:v", "h264_nvenc",
    "-preset", "p4",
    "-b:v", "1500k",
    "-maxrate", "2000k",
    "-bufsize", "4000k",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    "-y", outputPath,
    "-progress", "pipe:2",
    "-nostats",
  ]);
  let progress = "";
  process.stderr.on("data", (chunk) => {
    progress += chunk.toString();
    const matches = [...progress.matchAll(/out_time=([^\r\n]+)/g)];
    if (matches.length) process.stdout?.write?.("");
    if (progress.length > 16_000) progress = progress.slice(-8_000);
  });
  process.on("error", reject);
  process.on("exit", (code) =>
    code === 0 ? resolve() : reject(new Error(`FFmpeg алдаа: ${code}\n${progress.slice(-2000)}`)),
  );
});

const stat = await fs.stat(outputPath);
console.log(`TRANSCODE_DONE ${stat.size}`);
const created = await client.send(
  new CreateMultipartUploadCommand({
    Bucket: bucket,
    Key: movie.video_key,
    ContentType: "video/mp4",
    CacheControl: "public, max-age=31536000, immutable",
  }),
);
if (!created.UploadId) throw new Error("R2 multipart upload ID үүссэнгүй.");

const uploadId = created.UploadId;
const chunkSize = 32 * 1024 * 1024;
const parts = [];
try {
  for (let offset = 0, partNumber = 1; offset < stat.size; offset += chunkSize, partNumber += 1) {
    const end = Math.min(offset + chunkSize, stat.size);
    const uploaded = await client.send(
      new UploadPartCommand({
        Bucket: bucket,
        Key: movie.video_key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: createReadStream(outputPath, { start: offset, end: end - 1 }),
        ContentLength: end - offset,
      }),
    );
    if (!uploaded.ETag) throw new Error(`${partNumber}-р хэсгийн ETag ирсэнгүй.`);
    parts.push({ ETag: uploaded.ETag, PartNumber: partNumber });
    console.log(`UPLOAD_PART ${partNumber}/${Math.ceil(stat.size / chunkSize)}`);
  }
  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: movie.video_key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    }),
  );
} catch (error) {
  await client.send(
    new AbortMultipartUploadCommand({ Bucket: bucket, Key: movie.video_key, UploadId: uploadId }),
  ).catch(() => undefined);
  throw error;
}

const updated = await database
  .from("movies")
  .update({ bytes: stat.size, content_type: "video/mp4" })
  .eq("id", movie.id);
if (updated.error) throw updated.error;
await fs.unlink(outputPath).catch(() => undefined);
console.log(`REPLACED ${movie.video_key}`);
