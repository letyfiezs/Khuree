import { loginWithPin, pinAuthJson } from "@/lib/auth/pin-flow";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { kind?: "phone" | "email"; identifier?: string; pin?: string; returnTo?: string };
    return pinAuthJson(await loginWithPin(body), request);
  } catch (cause) {
    return Response.json({ error: cause instanceof Error ? cause.message : "Алдаа гарлаа." }, { status: 400 });
  }
}
