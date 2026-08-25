import { cookies } from "next/headers";
import {
  getCurrentUser,
  sessionCookieName,
  unlockAdultSession,
} from "@/lib/auth/local-auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return Response.json({ error: "Нэвтрэх шаардлагатай." }, { status: 401 });
  const { pin } = (await request.json()) as { pin?: string };
  const token = (await cookies()).get(sessionCookieName)?.value;
  if (!pin || !(await unlockAdultSession(token, user.id, pin)))
    return Response.json({ error: "PIN буруу байна." }, { status: 403 });
  return Response.json({ unlocked: true });
}
