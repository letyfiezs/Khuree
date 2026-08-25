import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { hasAdminPasswordSession } from "@/lib/auth/local-auth";
export const dynamic = "force-dynamic";
export default async function AdminLoginPage() {
  if (await hasAdminPasswordSession()) redirect("/admin");
  return <main className="admin-gate"><AdminLoginForm /></main>;
}
