import { apiAdmin } from "@/lib/admin";
import { getServerMetrics } from "@/lib/server-metrics";
import { getActiveStreamMetrics } from "@/lib/stream-metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await apiAdmin())) return Response.json({ error: "Админ эрх шаардлагатай." }, { status: 401 });
  return Response.json({ updatedAt: new Date().toISOString(), server: await getServerMetrics(), streams: getActiveStreamMetrics() }, { headers: { "Cache-Control": "no-store" } });
}
