import { getCurrentUser } from "@/lib/auth/local-auth";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 204 });

  const admin = createSupabaseAdminClient();
  const { data } = await admin.auth.admin.getUserById(user.id);
  if (!data.user) return new Response(null, { status: 204 });

  const lastSeenAt = data.user.user_metadata?.presence_last_seen_at;
  if (typeof lastSeenAt === "string" && Date.now() - new Date(lastSeenAt).getTime() < 75_000)
    return new Response(null, { status: 204 });

  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...data.user.user_metadata,
      presence_last_seen_at: new Date().toISOString(),
    },
  });
  return new Response(null, { status: 204 });
}
