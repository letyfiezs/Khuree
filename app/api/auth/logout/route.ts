import { createSupabaseServerClient } from "@/lib/supabase";
import { cookies } from "next/headers";
import { adminSessionCookieName } from "@/lib/auth/local-auth";
export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  (await cookies()).delete(adminSessionCookieName);
  return Response.json({ ok: true });
}
