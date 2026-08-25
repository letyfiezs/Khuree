import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { apiAdmin } from "@/lib/admin";
import { liveChannels } from "@/lib/live-channels";
import { movieStorage } from "@/lib/storage";
import { storageRoot, videosRoot } from "@/lib/storage/local";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Recording = {
  id: string;
  channelId: string;
  channelName: string;
  key: string;
  pid?: number;
  startedAt: string;
  status: "recording" | "finished" | "stopped" | "failed";
  published?: boolean;
};
const statePath = path.join(storageRoot, "live-recordings.json");
const readState = async (): Promise<Recording[]> => {
  try {
    return JSON.parse(await readFile(statePath, "utf8")) as Recording[];
  } catch {
    return [];
  }
};
const saveState = async (items: Recording[]) => {
  await mkdir(storageRoot, { recursive: true });
  await writeFile(statePath, JSON.stringify(items, null, 2), "utf8");
};
const admin = async () => Boolean(await apiAdmin());

export async function GET() {
  if (!(await admin()))
    return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 401 });
  return Response.json({
    channels: liveChannels,
    recordings: await readState(),
  });
}

export async function POST(request: Request) {
  const user = await apiAdmin();
  if (!user)
    return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 401 });
  const body = (await request.json()) as {
    action?: string;
    channelId?: string;
    recordingId?: string;
    minutes?: number;
    title?: string;
    ageRating?: string;
  };
  const recordings = await readState();
  if (body.action === "start") {
    const channel = liveChannels.find((item) => item.id === body.channelId);
    if (!channel || !ffmpegPath)
      return Response.json(
        { error: "Суваг эсвэл FFmpeg олдсонгүй." },
        { status: 400 },
      );
    if (
      recordings.some(
        (item) => item.channelId === channel.id && item.status === "recording",
      )
    )
      return Response.json(
        { error: "Энэ сувгийг аль хэдийн бичиж байна." },
        { status: 409 },
      );
    const minutes = Math.min(240, Math.max(1, Number(body.minutes ?? 30)));
    const id = crypto.randomUUID();
    const key = `${crypto.randomUUID()}.mp4`;
    await mkdir(videosRoot, { recursive: true });
    const child = spawn(
      ffmpegPath,
      [
        "-y",
        "-i",
        channel.streamUrl,
        "-t",
        String(minutes * 60),
        "-c",
        "copy",
        "-movflags",
        "+faststart",
        path.join(videosRoot, key),
      ],
      { windowsHide: true, stdio: "ignore" },
    );
    child.unref();
    const record: Recording = {
      id,
      channelId: channel.id,
      channelName: channel.name,
      key,
      pid: child.pid,
      startedAt: new Date().toISOString(),
      status: "recording",
    };
    recordings.unshift(record);
    await saveState(recordings);
    child.on("close", async (code) => {
      const latest = await readState();
      const item = latest.find((entry) => entry.id === id);
      if (item && item.status === "recording")
        item.status = code === 0 ? "finished" : "failed";
      await saveState(latest);
    });
    return Response.json({ recording: record });
  }
  const record = recordings.find((item) => item.id === body.recordingId);
  if (!record)
    return Response.json({ error: "Бичлэг олдсонгүй." }, { status: 404 });
  if (body.action === "stop") {
    if (record.pid) {
      try {
        process.kill(record.pid, "SIGTERM");
      } catch {}
    }
    record.status = "stopped";
    await saveState(recordings);
    return Response.json({ recording: record });
  }
  if (body.action === "publish") {
    if (record.status === "recording")
      return Response.json(
        { error: "Эхлээд бичлэгийг зогсооно уу." },
        { status: 409 },
      );
    const title = body.title?.trim() || `${record.channelName} архив`;
    movieStorage.createMovie({
      title,
      synopsis: `${record.channelName} сувгийн ${new Date(record.startedAt).toLocaleString("mn-MN")} үеийн архив.`,
      categories: ["Телевизийн архив"],
      videoKey: record.key,
      originalFilename: record.key,
      contentType: "video/mp4",
      bytes: 0,
      createdBy: user.id,
      ageRating: body.ageRating === "18+" ? "18+" : "Бүх нас",
      kind: "movie",
    });
    record.published = true;
    await saveState(recordings);
    return Response.json({ recording: record });
  }
  return Response.json({ error: "Тодорхойгүй үйлдэл." }, { status: 400 });
}
