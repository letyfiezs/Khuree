import { AdminShell } from "@/components/admin-shell";
import { AdminUsers } from "@/components/admin-users";
import { listAdminUsers } from "@/lib/admin-users";
import { requireAdmin } from "@/lib/auth/local-auth";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [admin, users] = await Promise.all([requireAdmin(), listAdminUsers()]);
  return <AdminShell user={admin} active="users"><AdminUsers initial={users} /></AdminShell>;
}
