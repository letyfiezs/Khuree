import { AccountSettings } from "@/components/account-settings";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth/local-auth";
export const dynamic = "force-dynamic";
export default async function AccountPage() {
  const user = await requireUser("/account");
  return (
    <main>
      <SiteHeader />
      <section className="account-page">
        <AccountSettings user={user} />
      </section>
    </main>
  );
}
