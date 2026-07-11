import { DashboardNav, MobileDashboardNav } from "@/components/dashboard/nav";
import { DevModeBanner } from "@/components/dev-mode-banner";
import { requireBusiness } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { business } = await requireBusiness();

  return (
    <div className="min-h-screen bg-background">
      <DevModeBanner />
      <MobileDashboardNav businessName={business.name} />
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <DashboardNav businessName={business.name} />
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
