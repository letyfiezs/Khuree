import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/local-auth";
import { getCatalogItem } from "@/lib/catalog";
import { signedR2PlaybackUrl } from "@/lib/r2";
import { isVerticalDrama } from "@/lib/vertical-drama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser();
  if (!user?.emailVerified) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const item = await getCatalogItem((await params).slug);
  if (!item || !isVerticalDrama(item) || !item.videoKey) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (user.role !== "admin") {
    if (!user.canWatch || !user.watchPermissions.vertical) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const deviceId = (await cookies()).get("khuree-device-id")?.value;
    if (!deviceId || !user.devices.some((device) => device.id === deviceId)) {
      return Response.json({ error: "Device not registered" }, { status: 403 });
    }
  }

  return Response.json({
    videoUrl: await signedR2PlaybackUrl(item.videoKey),
    segmentMinutes: item.verticalSegmentMinutes ?? 3,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
