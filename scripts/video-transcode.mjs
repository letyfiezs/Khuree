import { promises as fs } from "node:fs";
import path from "node:path";
import { transcodeToHls, uploadHlsDirectory } from "./lib/video-hls.mjs";

const args = Object.fromEntries(process.argv.slice(2).filter((arg) => arg.startsWith("--")).map((arg) => { const [key, ...value] = arg.slice(2).split("="); return [key, value.length ? value.join("=") : "true"]; }));
if (!args.input || !args.movieId) throw new Error("Usage: npm run video:transcode -- --input=/path/movie.mp4 --movieId=test [--upload]");
const input = path.resolve(args.input);
const stat = await fs.stat(input);
if (!stat.isFile() || path.extname(input).toLowerCase() !== ".mp4") throw new Error("Input нь MP4 файл байх ёстой.");
if (!/^[0-9a-z_-]{1,80}$/i.test(args.movieId)) throw new Error("movieId буруу байна.");
const outputDir = path.resolve(args.output || path.join("hls-output", args.movieId));
await fs.rm(outputDir, { recursive: true, force: true });
console.log("[VIDEO] job started");
await transcodeToHls({ input, outputDir, sourceBytes: stat.size, onProgress: (value) => console.log(`[VIDEO] ffmpeg progress: ${value}%`) });
if (args.upload === "true") {
  console.log("[VIDEO] uploading HLS to R2");
  const uploaded = await uploadHlsDirectory({ outputDir, movieId: args.movieId });
  console.log(`[VIDEO] master playlist ready: ${uploaded.masterKey}`);
  await fs.rm(outputDir, { recursive: true, force: true });
  console.log("[VIDEO] temporary files cleaned");
} else {
  console.log(`[VIDEO] local master playlist ready: ${path.join(outputDir, "master.m3u8")}`);
}
