import { DashboardNav, MobileDashboardNav } from "@/components/dashboard/nav";
import { DevModeBanner } from "@/components/dev-mode-banner";
import { AuthControls } from "@/components/auth/auth-controls";
import { isPlatformAdmin, requireBusiness } from "@/lib/auth";
import { isClerkConfigured } from "@/lib/utils/app";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, business } = await requireBusiness();
  const showAdminLink = isPlatformAdmin(user);

  return (
    <div className="min-h-screen bg-background">
      <DevModeBanner />
      <MobileDashboardNav businessName={business.name} showAdminLink={showAdminLink} />
      {isClerkConfigured() && (
        <div className="flex justify-end border-b border-border/40 px-4 py-2 lg:px-6">
          <AuthControls />
        </div>
      )}
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <DashboardNav businessName={business.name} showAdminLink={showAdminLink} />
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
