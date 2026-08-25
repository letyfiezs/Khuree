import { SiteHeader } from "@/components/site-header";
import { LiveTv } from "@/components/live-tv";
import { requireUser } from "@/lib/auth/local-auth";
export const dynamic = "force-dynamic";
export default async function LivePage() {
  await requireUser("/live");
  return (
    <main>
      <SiteHeader />
      <div className="live-page">
        <LiveTv />
      </div>
    </main>
  );
}
