import { AdminPricing } from "@/components/admin-pricing";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth/local-auth";
import { getPricingSettings } from "@/lib/pricing";
export const dynamic = "force-dynamic";
export default async function PricingPage() {
  const user = await requireAdmin();
  return <AdminShell user={user} active="pricing"><AdminPricing initial={await getPricingSettings()} /></AdminShell>;
}
