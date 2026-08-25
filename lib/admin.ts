import { getCurrentUser, hasAdminPasswordSession } from "@/lib/auth/local-auth";
export async function apiAdmin() {
  if (await hasAdminPasswordSession()) return { role: "admin", id: "admin-password" };
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}
