import { TikTokTapCastShell } from "@/components/fusion/tapcast/tiktok-shell";
import { requireBusiness } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TikTokTapCastPage() {
  await requireBusiness();
  return (
    <div className="p-5 lg:p-8">
      <TikTokTapCastShell />
    </div>
  );
}
