import { readFile } from "node:fs/promises";
import path from "node:path";
import { postersRoot } from "@/lib/storage/local";
export const runtime = "nodejs";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const key = (await params).key;
  if (!/^[a-f0-9-]{20,50}\.(jpg|png|webp)$/i.test(key))
    return new Response("Not found", { status: 404 });
  try {
    const bytes = await readFile(path.join(postersRoot, key));
    const type = key.endsWith(".png")
      ? "image/png"
      : key.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";
    return new Response(bytes, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
