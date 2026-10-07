import { createReadStream, promises as fs } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const presets = [
  { name: "1080", edge: 1080, width: 1920, height: 1080, bitrate: "5000k", maxrate: "5350k", bufsize: "7500k", bandwidth: 5500000 },
  { name: "720", edge: 720, width: 1280, height: 720, bitrate: "2800k", maxrate: "2996k", bufsize: "4200k", bandwidth: 3000000 },
  { name: "360", edge: 360, width: 640, height: 360, bitrate: "800k", maxrate: "856k", bufsize: "1200k", bandwidth: 950000 },
];

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} тохиргоо дутуу байна.`);
  return value;
};

export function createR2() {
  const accountId = requiredEnv("R2_ACCOUNT_ID");
  return {
    client: new S3Client({ region: "auto", endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"), secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY") } }),
    bucket: requiredEnv("R2_BUCKET_NAME"),
  };
}

function parseRate(value) {
  const [numerator, denominator = "1"] = String(value || "0").split("/").map(Number);
  return denominator ? numerator / denominator : 0;
}

function clockSeconds(value) {
  const [hours, minutes, seconds] = value.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function run(command, args, onLine) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stdout = "", stderr = "";
    const consume = (chunk, isError) => {
      const text = chunk.toString();
      if (isError) stderr = (stderr + text).slice(-12000); else stdout += text;
      for (const line of text.replace(/\r/g, "").split("\n")) if (line) onLine?.(line, isError);
    };
    child.stdout.on("data", (chunk) => consume(chunk, false));
    child.stderr.on("data", (chunk) => consume(chunk, true));
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${path.basename(command)} exited with code ${code}: ${stderr.slice(-3000)}`)));
  });
}

export async function probeVideo(input) {
  const command = process.env.FFPROBE_PATH || "ffprobe";
  const { stdout } = await run(command, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,codec_name,avg_frame_rate:format=duration", "-of", "json", input]);
  const result = JSON.parse(stdout);
  const stream = result.streams?.[0];
  const width = Number(stream?.width), height = Number(stream?.height), duration = Number(result.format?.duration), fps = parseRate(stream?.avg_frame_rate);
  if (!width || !height || !duration) throw new Error("ffprobe видео мэдээллийг уншиж чадсангүй.");
  return { width, height, duration, fps: fps || 30, codec: String(stream.codec_name || "unknown") };
}

function outputSize(source, preset) {
  const portrait = source.height > source.width;
  const maxWidth = portrait ? preset.height : preset.width;
  const maxHeight = portrait ? preset.width : preset.height;
  const ratio = Math.min(1, maxWidth / source.width, maxHeight / source.height);
  return { width: Math.max(2, Math.floor(source.width * ratio / 2) * 2), height: Math.max(2, Math.floor(source.height * ratio / 2) * 2) };
}

export function selectRenditions(source) {
  const sourceEdge = Math.min(source.width, source.height);
  const selected = presets.filter((preset) => sourceEdge >= preset.edge);
  return (selected.length ? selected : [presets.at(-1)]).map((preset) => ({ ...preset, ...outputSize(source, preset) }));
}

async function ensureDiskSpace(directory, sourceBytes) {
  const stats = await fs.statfs(directory);
  const available = Number(stats.bavail) * Number(stats.bsize);
  const required = Math.ceil(sourceBytes * 2.5 + 2 * 1024 ** 3);
  if (available < required) throw new Error(`Түр диск хүрэлцэхгүй. Шаардлагатай: ${Math.ceil(required / 1024 ** 3)}GB, сул: ${Math.floor(available / 1024 ** 3)}GB.`);
}

export async function transcodeToHls({ input, outputDir, sourceBytes, onProgress = () => {} }) {
  await fs.mkdir(outputDir, { recursive: true });
  await ensureDiskSpace(outputDir, sourceBytes);
  const source = await probeVideo(input);
  const renditions = selectRenditions(source);
  console.log(`[VIDEO] source resolution: ${source.width}x${source.height}, ${source.fps.toFixed(3)}fps, ${source.codec}`);
  console.log(`[VIDEO] generating: ${renditions.map((item) => `${item.name}p`).join(", ")}`);
  const gop = Math.max(24, Math.round(source.fps * 2));
  const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
  for (let index = 0; index < renditions.length; index += 1) {
    const rendition = renditions[index];
    const renditionDir = path.join(outputDir, rendition.name);
    await fs.mkdir(renditionDir, { recursive: true });
    await run(ffmpeg, [
      "-hide_banner", "-y", "-i", input,
      "-map", "0:v:0", "-map", "0:a:0?", "-vf", `scale=${rendition.width}:${rendition.height}`,
      "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p",
      "-b:v", rendition.bitrate, "-maxrate", rendition.maxrate, "-bufsize", rendition.bufsize,
      "-g", String(gop), "-keyint_min", String(gop), "-sc_threshold", "0", "-force_key_frames", "expr:gte(t,n_forced*2)",
      "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
      "-hls_time", "6", "-hls_playlist_type", "vod", "-hls_flags", "independent_segments",
      "-hls_segment_filename", path.join(renditionDir, "segment_%05d.ts"), path.join(renditionDir, "index.m3u8"),
      "-progress", "pipe:1", "-nostats",
    ], (line, isError) => {
      if (isError || !line.startsWith("out_time=")) return;
      const ratio = Math.min(1, clockSeconds(line.slice(9)) / source.duration);
      onProgress(Math.round(((index + ratio) / renditions.length) * 80));
    });
  }
  const master = ["#EXTM3U", "#EXT-X-VERSION:3", "#EXT-X-INDEPENDENT-SEGMENTS"];
  for (const rendition of renditions) {
    master.push(`#EXT-X-STREAM-INF:BANDWIDTH=${rendition.bandwidth},RESOLUTION=${rendition.width}x${rendition.height}`);
    master.push(`${rendition.name}/index.m3u8`);
  }
  await fs.writeFile(path.join(outputDir, "master.m3u8"), `${master.join("\n")}\n`, "utf8");
  for (const rendition of renditions) await fs.access(path.join(outputDir, rendition.name, "index.m3u8"));
  onProgress(80);
  return { source, renditions };
}

async function listFiles(root, directory = root) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, fullPath));
    else files.push({ fullPath, relativePath: path.relative(root, fullPath).split(path.sep).join("/") });
  }
  return files;
}

async function deletePrefix(client, bucket, prefix) {
  let token;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
    const objects = (page.Contents ?? []).flatMap((object) => object.Key ? [{ Key: object.Key }] : []);
    if (objects.length) await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects, Quiet: true } }));
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
}

async function bucketBytes(client, bucket) {
  let token, total = 0;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
    total += (page.Contents ?? []).reduce((sum, object) => sum + Number(object.Size ?? 0), 0);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return total;
}

const fileType = (name) => name.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : name.endsWith(".ts") ? "video/mp2t" : "application/octet-stream";

export async function uploadHlsDirectory({ outputDir, movieId, onProgress = () => {} }) {
  if (!/^[0-9a-z_-]{1,80}$/i.test(movieId)) throw new Error("movieId аюулгүй форматтай байх ёстой.");
  const { client, bucket } = createR2();
  const prefix = `movies/${movieId}/hls/`;
  const files = (await listFiles(outputDir)).sort((a, b) => Number(a.relativePath === "master.m3u8") - Number(b.relativePath === "master.m3u8"));
  if (!files.some((file) => file.relativePath === "master.m3u8")) throw new Error("master.m3u8 үүсээгүй байна.");
  await deletePrefix(client, bucket, prefix);
  const sizes = await Promise.all(files.map((file) => fs.stat(file.fullPath)));
  const totalBytes = sizes.reduce((total, stat) => total + stat.size, 0);
  const hardLimit = Number(process.env.R2_HARD_LIMIT_BYTES || 2 * 1000 ** 4);
  const currentBytes = await bucketBytes(client, bucket);
  if (currentBytes + totalBytes > hardLimit) throw new Error("R2 хадгалах сангийн 2TB хязгаар HLS upload-аар хэтрэхээр байна.");
  let uploadedCount = 0;
  for (let index = 0; index < files.length; index += 6) {
    await Promise.all(files.slice(index, index + 6).map(async (file, offset) => {
      const stat = sizes[index + offset];
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: `${prefix}${file.relativePath}`, Body: createReadStream(file.fullPath), ContentLength: stat.size, ContentType: fileType(file.relativePath), CacheControl: "public, max-age=31536000, immutable" }));
      uploadedCount += 1;
      onProgress(80 + Math.round((uploadedCount / files.length) * 19));
    }));
  }
  const master = await fs.readFile(path.join(outputDir, "master.m3u8"), "utf8");
  const playlists = master.split("\n").filter((line) => line && !line.startsWith("#"));
  await Promise.all(["master.m3u8", ...playlists].map((name) => client.send(new HeadObjectCommand({ Bucket: bucket, Key: `${prefix}${name}` }))));
  console.log(`[VIDEO] uploaded ${files.length} files`);
  return { masterKey: `${prefix}master.m3u8`, files: files.length, bytes: totalBytes };
}

export async function downloadR2Object(key, destination) {
  if (!/^movies\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.mp4$/i.test(key)) throw new Error("Эх MP4 key буруу байна.");
  const { client, bucket } = createR2();
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw new Error("R2 эх файл олдсонгүй.");
  await pipeline(response.Body, (await import("node:fs")).createWriteStream(destination));
}
