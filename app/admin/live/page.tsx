import { AdminLive } from "@/components/admin-live";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth/local-auth";

export const dynamic = "force-dynamic";
export default async function AdminLivePage() {
  const user = await requireAdmin();
  return (
    <AdminShell user={user} active="live">
      <AdminLive />
    </AdminShell>
  );
}
