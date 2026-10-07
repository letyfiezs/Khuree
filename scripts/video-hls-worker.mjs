import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { downloadR2Object, transcodeToHls, uploadHlsDirectory } from "./lib/video-hls.mjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !supabaseUrl) throw new Error("Supabase worker environment variables are missing.");
const database = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const transcodeRoot = process.env.HUREE_TRANSCODE_TMP || path.join(os.tmpdir(), "huree-transcode");
let stopping = false;
process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });

async function update(id, values) {
  const result = await database.from("movies").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id);
  if (result.error) throw result.error;
}

async function processMovie(movie) {
  await fs.mkdir(transcodeRoot, { recursive: true });
  const jobDir = await fs.mkdtemp(path.join(transcodeRoot, `${movie.id}-`));
  const source = path.join(jobDir, "source.mp4"), outputDir = path.join(jobDir, "hls");
  let lastProgress = -1;
  let progressChain = Promise.resolve();
  const progress = (value) => {
    if (value <= lastProgress || value >= 100) return;
    lastProgress = value;
    console.log(`[VIDEO] ffmpeg progress: ${value}%`);
    progressChain = progressChain.then(() => update(movie.id, { transcode_progress: value })).catch((error) => console.error("[VIDEO] progress update failed", error.message));
  };
  console.log(`[VIDEO] job started: ${movie.id} ${movie.title}`);
  try {
    await update(movie.id, { status: "processing", transcode_progress: 1, transcode_error: null, transcode_started_at: new Date().toISOString(), transcode_finished_at: null });
    console.log("[VIDEO] downloading original from R2");
    await downloadR2Object(movie.video_key, source);
    await transcodeToHls({ input: source, outputDir, sourceBytes: Number(movie.bytes), onProgress: progress });
    console.log("[VIDEO] uploading HLS to R2");
    const uploaded = await uploadHlsDirectory({ outputDir, movieId: movie.id, onProgress: progress });
    await progressChain;
    await update(movie.id, { hls_key: uploaded.masterKey, hls_bytes: uploaded.bytes, status: "published", transcode_progress: 100, transcode_error: null, transcode_finished_at: new Date().toISOString() });
    console.log(`[VIDEO] master playlist ready: ${uploaded.masterKey}`);
    console.log("[VIDEO] database updated");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown transcoding error";
    console.error(`[VIDEO] job failed: ${movie.id}: ${message}`);
    await update(movie.id, { status: "failed", transcode_error: message.slice(0, 2000), transcode_finished_at: new Date().toISOString() }).catch((updateError) => console.error("[VIDEO] failed status update failed", updateError.message));
  } finally {
    await fs.rm(jobDir, { recursive: true, force: true }).catch(() => undefined);
    console.log("[VIDEO] temporary files cleaned");
  }
}

await fs.mkdir(transcodeRoot, { recursive: true });
for (const entry of await fs.readdir(transcodeRoot)) await fs.rm(path.join(transcodeRoot, entry), { recursive: true, force: true });
console.log("[VIDEO] worker ready");
while (!stopping) {
  const result = await database.from("movies").select("id,title,video_key,bytes").eq("status", "processing").is("hls_key", null).not("video_key", "is", null).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (result.error) { console.error("[VIDEO] queue read failed", result.error.message); await sleep(10000); continue; }
  if (!result.data) { await sleep(5000); continue; }
  await processMovie(result.data);
}
console.log("[VIDEO] worker stopped");
