import { AdminChat } from "@/components/admin-chat";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth/local-auth";

export const dynamic = "force-dynamic";

export default async function AdminChatPage() {
  const user = await requireAdmin();
  return <AdminShell user={user} active="chat"><AdminChat /></AdminShell>;
}
