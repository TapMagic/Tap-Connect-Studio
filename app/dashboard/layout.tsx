import { DashboardNav, MobileDashboardNav } from "@/components/dashboard/nav";
import { StudioTopBar } from "@/components/studio/studio-top-bar";
import { DevModeBanner } from "@/components/dev-mode-banner";
import { requireBusiness } from "@/lib/auth";
import { TAP_CONNECT_LOGO } from "@/lib/brand/assets";
import { prisma } from "@/lib/db";
import { loadFeatureContext } from "@/lib/fusion/features/server";
import "@/app/t/tap.css";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const { business } = await requireBusiness();
    const logo = business.logoUrl;
    return {
      title: `${business.name} · Tap Connect Studio`,
      icons: logo
        ? { icon: [{ url: logo }], apple: [{ url: logo }] }
        : {
            icon: [
              { url: "/favicon.ico", sizes: "any" },
              { url: TAP_CONNECT_LOGO, type: "image/png" },
            ],
            apple: "/apple-touch-icon.png",
          },
    };
  } catch {
    return { title: "Tap Connect Studio" };
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { business } = await requireBusiness();
  const featureCtx = await loadFeatureContext();

  let alertCount = 0;
  try {
    alertCount = await prisma.fusionOutboxEvent.count({
      where: { status: "FAILED", businessId: business.id },
    });
  } catch {
    alertCount = 0;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#050814] text-foreground lg:h-[100dvh] lg:max-h-[100dvh] lg:overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <DevModeBanner />
      <MobileDashboardNav businessName={business.name} featureCtx={featureCtx} />
      <StudioTopBar
        businessName={business.name}
        readinessLabel={alertCount > 0 ? "Attention needed" : "Studio ready"}
        alertCount={alertCount}
      />
      <div className="mx-auto flex min-h-0 w-full max-w-[1680px] flex-1">
        <DashboardNav businessName={business.name} featureCtx={featureCtx} />
        <main
          id="main-content"
          tabIndex={-1}
          className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-br from-[#050814] via-[#070b14] to-[#0a1220] focus:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
