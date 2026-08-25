import { cookies } from "next/headers";
import { adminSessionCookieName, createAdminSessionValue, verifyAdminPassword } from "@/lib/auth/local-auth";

export async function POST(request: Request) {
  const body = await request.json() as { password?: string };
  if (!verifyAdminPassword(body.password ?? "")) return Response.json({ error: "Нууц үг буруу байна." }, { status: 401 });
  (await cookies()).set(adminSessionCookieName, createAdminSessionValue(), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 60 * 60 * 12,
  });
  return Response.json({ ok: true });
}
