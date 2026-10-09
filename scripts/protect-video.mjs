import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, stat, statfs, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

const movieId = process.argv[2];
if (!/^[0-9a-f-]{36}$/i.test(movieId ?? "")) throw new Error("Valid movie ID required.");

const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "VIDEO_EDGE_URL", "VIDEO_EDGE_SECRET"];
for (const name of required) if (!process.env[name]) throw new Error(`${name} is missing.`);

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const edgeUrl = process.env.VIDEO_EDGE_URL.replace(/\/$/, "");
const assetId = movieId;
let workDir;
const lockDir = join(tmpdir(), "khuree-hls-worker.lock");
let lockAcquired = false;

async function acquireLock() {
  for (let attempt = 0; attempt < 1_080; attempt += 1) {
    try { await mkdir(lockDir); return; }
    catch (error) {
      if (error?.code !== "EEXIST") throw error;
      await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
  }
  throw new Error("Secure video worker queue timed out.");
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr = `${stderr}${chunk}`.slice(-8000); });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg failed (${code}): ${stderr.slice(-1200)}`)));
  });
}

async function upload(filename, contentType) {
  const path = join(workDir, filename);
  const file = await stat(path);
  const response = await fetch(`${edgeUrl}/internal/hls/${assetId}/${filename}`, {
    method: "PUT",
    headers: {
      "content-type": contentType,
      "content-length": String(file.size),
      "x-khuree-internal-secret": process.env.VIDEO_EDGE_SECRET,
    },
    body: createReadStream(path),
    duplex: "half",
  });
  if (!response.ok) throw new Error(`Private R2 upload failed for ${filename}: ${response.status}`);
}

try {
  await acquireLock();
  lockAcquired = true;
  const ready = await fetch(`${edgeUrl}/internal/hls/${assetId}/index.m3u8`, { method: "HEAD", headers: { "x-khuree-internal-secret": process.env.VIDEO_EDGE_SECRET } });
  if (ready.ok) {
    await rm(lockDir, { recursive: true, force: true });
    lockAcquired = false;
    process.exit(0);
  }
  const { data: movie, error } = await db.from("movies").select("id,video_key,bytes").eq("id", movieId).maybeSingle();
  if (error) throw error;
  if (!movie?.video_key) throw new Error("Movie video is missing.");

  const disk = await statfs(tmpdir());
  const freeBytes = disk.bavail * disk.bsize;
  const requiredBytes = Math.max(Number(movie.bytes ?? 0) * 2.2, 5 * 1024 ** 3);
  if (freeBytes < requiredBytes) throw new Error("VPS temporary disk space is insufficient for secure packaging.");

  workDir = await mkdtemp(join(tmpdir(), "khuree-hls-"));
  const inputPath = join(workDir, "source.mp4");
  const source = await r2.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: movie.video_key }));
  if (!source.Body) throw new Error("Source video could not be read from R2.");
  await pipeline(source.Body, createWriteStream(inputPath));

  const key = randomBytes(16);
  const iv = randomBytes(16).toString("hex");
  const keyPath = join(workDir, "key.bin");
  await writeFile(keyPath, key);
  const keyInfoPath = join(workDir, "key-info.txt");
  await writeFile(keyInfoPath, `key.bin\n${keyPath}\n${iv}\n`, { mode: 0o600 });
  await runFfmpeg([
    "-hide_banner", "-loglevel", "warning", "-i", inputPath,
    "-map", "0:v:0", "-map", "0:a:0?", "-c", "copy",
    "-hls_time", "6", "-hls_playlist_type", "vod",
    "-hls_key_info_file", keyInfoPath,
    "-hls_segment_filename", join(workDir, "segment-%06d.ts"),
    join(workDir, "index.m3u8"),
  ]);

  const files = (await readdir(workDir)).filter((name) => name === "index.m3u8" || name === "key.bin" || /^segment-\d+\.ts$/.test(name));
  if (!files.includes("index.m3u8") || !files.includes("key.bin") || !files.some((name) => name.endsWith(".ts"))) throw new Error("HLS package is incomplete.");
  for (const filename of files.filter((name) => name.endsWith(".ts")).sort()) await upload(filename, "video/mp2t");
  await upload("key.bin", "application/octet-stream");
  await upload("index.m3u8", "application/vnd.apple.mpegurl");
} catch (error) {
  const message = error instanceof Error ? error.message : "Secure packaging failed.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
} finally {
  if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  if (lockAcquired) await rm(lockDir, { recursive: true, force: true }).catch(() => undefined);
}
