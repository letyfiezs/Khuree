import { getCurrentUser } from "@/lib/auth/local-auth";
import { publicSession } from "@/lib/auth/pin-flow";
import { createSupabaseAuthClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ user: null }, { status: 401 });
  return Response.json({ user });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { refreshToken?: string };
  if (!body.refreshToken) return Response.json({ error: "Refresh token шаардлагатай." }, { status: 400 });
  const { data, error } = await createSupabaseAuthClient().auth.refreshSession({ refresh_token: body.refreshToken });
  if (error || !data.session) return Response.json({ error: "Сесс шинэчилж чадсангүй." }, { status: 401 });
  return Response.json({ user: await getCurrentUser(data.user), ...publicSession(data.session) });
}
