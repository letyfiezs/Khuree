import { publicSession, signupWithPin } from "@/lib/auth/pin-flow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { kind?: "phone" | "email"; identifier?: string; pin?: string; name?: string };
    const result = await signupWithPin(body);
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ ok: true, user: result.user, ...publicSession(result.session) });
  } catch (cause) {
    return Response.json({ error: cause instanceof Error ? cause.message : "Алдаа гарлаа." }, { status: 400 });
  }
}
